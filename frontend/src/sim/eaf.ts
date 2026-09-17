/**
 * Prosessmodell for stålovnen (lysbueovn med conveyor-mating).
 *
 * Modellen følger prosessen slik den er beskrevet i metallurgikompendiet for
 * Celsa Armeringsstål: skrapet mates kontinuerlig inn på et flatt bad med
 * stålsump via en forvarmet conveyor, slagg bygges med kalk og dolomitt,
 * oksygen og karbon blåses inn gjennom KT-lansene, fosfor tas ut gjennom
 * slaggen, og chargen slagges av før temperaturen kjøres opp mot tapping.
 *
 * Modellen er lumped-parameter: den gjengir riktig retning, rekkefølge og
 * størrelsesorden på de koblingene en operatør faktisk må håndtere, men er
 * ikke en termodynamisk nøyaktig gjengivelse av anlegget.
 */
import * as C from "./constants";
import { DEFAULT_GRADE, getGrade } from "./grades";
import { Rng } from "./rng";
import type { Alarm, SimState, SteelGrade } from "./state";
import type { Severity, TapResult } from "../types";

// Varmeovergang fra badet til umeltet skrap, MW per grad overheting
const MELT_HEAT_TRANSFER_MW_PER_K = 1.0;
const MELT_CONTACT_REFERENCE_KG = 8000.0;

// Støkiometri, Nm3 O2 per kg element
const O2_NM3_PER_KG_SI = 0.8;
const O2_NM3_PER_KG_MN = 0.204;
const O2_NM3_PER_KG_FE = 0.2;

// Oksidmasse per kg oksidert element
const OXIDE_FACTOR: Record<string, number> = {
  SiO2: 60.0 / 28.0,
  MnO: 71.0 / 55.0,
  FeO: 72.0 / 56.0,
  P2O5: 142.0 / 62.0,
};

const SLAG_OXIDES = ["CaO", "MgO", "SiO2", "Al2O3", "FeO", "MnO", "Cr2O3", "P2O5"];

// Likevektsnivå for fosfor i stålet under ideelle avfosforeringsforhold
const P_EQUILIBRIUM_BASE_PCT = 0.006;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class EAFSimulation {
  readonly state: SimState;
  private rng: Rng;
  private coGenerationKgS = 0;
  private foamCoKgS = 0;

  constructor(rngSeed?: number) {
    this.rng = new Rng(rngSeed);
    this.state = {} as SimState;
    this.resetFurnace();
  }

  // ---------------------------------------------------------------- //
  // Oppsett
  // ---------------------------------------------------------------- //
  private resetFurnace(): void {
    const s = this.state;
    s.timeS = 0;
    s.phase = "klar";
    s.powerOn = false;
    s.timeScale = 1;
    s.transformerTap = 3;
    s.electricalPowerMw = 0;
    s.chemicalPowerMw = 0;
    s.electrodes = Array.from({ length: C.NUM_ELECTRODES }, (_, i) => ({
      index: i,
      positionPct: 0,
      targetPositionPct: 0,
      currentKa: 0,
      voltageV: 0,
      mode: "auto" as const,
      lengthM: C.ELECTRODE_LENGTH_NEW_M,
      consumedM: 0,
      broken: false,
    }));
    s.electrodeCoolingPct = C.ELECTRODE_COOLING_NOMINAL_PCT;
    s.hvelvDustLevel = 0.1;

    // Ovnen står med en stålsump fra forrige charge
    s.liquidMassKg = C.HEEL_MASS_KG;
    s.solidScrapKg = 0;
    s.bathTempC = 1560;
    s.scrapChargedKg = 0;
    s.carbonPct = C.CARBON_FROM_SCRAP_PCT;
    s.phosphorusPct = C.PHOSPHORUS_FROM_SCRAP_PCT;
    s.scrapPhosphorusPct = C.PHOSPHORUS_FROM_SCRAP_PCT;
    s.siliconPct = 0.15;
    s.manganesePct = 0.2;

    s.conveyorRateTMin = 0;
    s.conveyorRunning = false;
    s.preheatTempC = C.AMBIENT_TEMP_C;
    s.staticSealOk = true;
    s.chargeRemainingKg = 0;

    s.slag = Object.fromEntries(SLAG_OXIDES.map((ox) => [ox, 0]));
    s.slag.CaO = 900;
    s.slag.MgO = 400;
    s.slag.SiO2 = 500;
    s.slag.FeO = 700;
    s.slagFoamIndex = 0;

    s.limeRateKgMin = 0;
    s.dolomiteRateKgMin = 0;
    s.magnesiteRateKgMin = 0;
    s.carbonInjectionKgMin = 0;
    s.oxygenFlowNm3h = 0;
    s.limeTotalKg = 0;
    s.dolomiteTotalKg = 0;
    s.carbonTotalKg = 0;
    s.oxygenTotalNm3 = 0;

    s.slagDoorOpen = false;
    s.tiltDeg = 0;
    s.offgasTempC = 200;
    s.offgasCoPct = 0;

    s.cooling = Object.fromEntries(
      Object.entries(C.COOLING_CIRCUITS).map(([name, cfg]) => [
        name,
        {
          name,
          flowLpm: cfg.nominalFlowLpm,
          nominalFlowLpm: cfg.nominalFlowLpm,
          deltaTC: 0,
          leaking: false,
          flowLossFraction: 0,
        },
      ]),
    );

    s.grade = DEFAULT_GRADE;
    s.energyTotalMwh = 0;
    s.refractoryWear = 0;
    s.heatNumber = 0;
    s.lastTapResult = null;
    s.alarms = [];
    s.nextAlarmId = 1;
    s.scenario = null;
  }

  // ---------------------------------------------------------------- //
  // Alarmer
  // ---------------------------------------------------------------- //
  private raiseAlarm(code: string, message: string, severity: Severity): void {
    const s = this.state;
    if (s.alarms.some((a) => a.code === code && a.active)) return;
    const alarm: Alarm = {
      id: s.nextAlarmId++,
      code,
      message,
      severity,
      active: true,
      ack: false,
      raisedAtS: s.timeS,
    };
    s.alarms.push(alarm);
  }

  private clearAlarm(code: string): void {
    for (const a of this.state.alarms) {
      if (a.code === code && a.active) a.active = false;
    }
  }

  ackAlarm(alarmId: number): void {
    for (const a of this.state.alarms) {
      if (a.id === alarmId) a.ack = true;
    }
  }

  // ---------------------------------------------------------------- //
  // Avledede prosessverdier
  // ---------------------------------------------------------------- //
  get slagMassKg(): number {
    return Object.values(this.state.slag).reduce((sum, v) => sum + v, 0);
  }

  slagPct(oxide: string): number {
    const total = this.slagMassKg;
    if (total <= 0) return 0;
    return (100 * (this.state.slag[oxide] ?? 0)) / total;
  }

  get b2(): number {
    const sio2 = this.state.slag.SiO2 ?? 0;
    if (sio2 <= 0) return 0;
    return (this.state.slag.CaO ?? 0) / sio2;
  }

  get b3(): number {
    const denom = (this.state.slag.SiO2 ?? 0) + (this.state.slag.Al2O3 ?? 0);
    if (denom <= 0) return 0;
    return (this.state.slag.CaO ?? 0) / denom;
  }

  get liquidusC(): number {
    return C.liquidusTempC(this.state.carbonPct);
  }

  /** Tappetemperatur styres av likvidus for ferdig kvalitet, ikke for badet slik det
   * står nå, siden karbonet legeres opp igjen ved tapping og på øseovnen. */
  get tapTargetTempC(): number {
    const grade = this.state.grade ?? DEFAULT_GRADE;
    return C.liquidusTempC(grade.finalCarbonPct) + C.TAP_SUPERHEAT_TARGET_C;
  }

  // ---------------------------------------------------------------- //
  // Operatørkommandoer
  // ---------------------------------------------------------------- //
  setPower(on: boolean): void {
    const s = this.state;
    if (on) {
      if (s.electrodes.some((e) => e.broken)) {
        this.raiseAlarm(
          "POWER_BLOCK_ELECTRODE",
          "Kan ikke slå på lysbue: elektrode er brukket",
          "warning",
        );
        return;
      }
      if (Math.abs(s.tiltDeg) > 3) {
        this.raiseAlarm(
          "POWER_BLOCK_TILT",
          "Kan ikke slå på lysbue mens ovnen er tippet",
          "warning",
        );
        return;
      }
    }
    s.powerOn = on;
  }

  setTransformerTap(tap: number): void {
    this.state.transformerTap = clamp(Math.round(tap), 0, C.TRANSFORMER_TAPS_V.length - 1);
  }

  setRegulationMode(electrode: number, mode: "auto" | "manual"): void {
    const e = this.state.electrodes[electrode];
    if (e) e.mode = mode;
  }

  setElectrodePosition(electrode: number, positionPct: number): void {
    const e = this.state.electrodes[electrode];
    if (e && e.mode === "manual") e.targetPositionPct = clamp(positionPct, 0, 100);
  }

  setElectrodeCooling(pct: number): void {
    this.state.electrodeCoolingPct = clamp(pct, 0, 100);
  }

  /** Start ny charge: en skrapkasse på ca. 92 tonn gjøres klar for conveyor. */
  startCharge(gradeCode?: string): boolean {
    const s = this.state;
    if (s.phase !== "klar" && s.phase !== "klargjoring") return false;
    const grade: SteelGrade | undefined = gradeCode ? getGrade(gradeCode) : (s.grade ?? undefined);
    s.grade = grade ?? DEFAULT_GRADE;
    s.chargeRemainingKg = C.CHARGE_SCRAP_MASS_KG;
    s.scrapChargedKg = 0;
    s.heatNumber += 1;
    s.phase = "innsmelting";
    return true;
  }

  setConveyor(running: boolean): void {
    this.state.conveyorRunning = running;
  }

  setConveyorRate(tMin: number): void {
    this.state.conveyorRateTMin = clamp(tMin, 0, C.CONVEYOR_MAX_RATE_T_MIN);
  }

  setLimeRate(kgMin: number): void {
    this.state.limeRateKgMin = clamp(kgMin, 0, C.LIME_MAX_KG_MIN);
  }

  setDolomiteRate(kgMin: number): void {
    this.state.dolomiteRateKgMin = clamp(kgMin, 0, C.DOLOMITE_MAX_KG_MIN);
  }

  setMagnesiteRate(kgMin: number): void {
    this.state.magnesiteRateKgMin = clamp(kgMin, 0, C.MAGNESITE_MAX_KG_MIN);
  }

  setCarbonInjection(kgMin: number): void {
    this.state.carbonInjectionKgMin = clamp(kgMin, 0, C.CARBON_INJECTION_MAX_KG_MIN);
  }

  setOxygenFlow(nm3h: number): void {
    this.state.oxygenFlowNm3h = clamp(nm3h, 0, C.OXYGEN_MAX_NM3_H);
  }

  setSlagDoor(open: boolean): void {
    this.state.slagDoorOpen = open;
  }

  setTilt(deg: number): void {
    const s = this.state;
    const clamped = clamp(deg, C.SLAG_POSITION_DEG - 2, C.TAP_POSITION_DEG + 2);
    if (Math.abs(clamped) > 3 && s.powerOn) this.setPower(false);
    s.tiltDeg = clamped;
  }

  /** Støvsuging av hvelvet reduserer faren for overslag. Krever at ovnen står. */
  vacuumHvelv(): boolean {
    const s = this.state;
    if (s.powerOn) {
      this.raiseAlarm("VACUUM_BLOCKED", "Støvsuging av hvelv krever at lysbuen er av", "warning");
      return false;
    }
    s.hvelvDustLevel = 0;
    return true;
  }

  startTap(): boolean {
    const s = this.state;
    if (s.phase !== "raffinering" && s.phase !== "avslagging") return false;
    this.setPower(false);
    s.phase = "tapping";
    s.tiltDeg = C.TAP_POSITION_DEG;
    if (s.bathTempC < this.tapTargetTempC - C.TAP_SUPERHEAT_WINDOW_C) {
      this.raiseAlarm(
        "TAP_COLD",
        `Tappet kaldt: ${s.bathTempC.toFixed(0)} °C mot mål ${this.tapTargetTempC.toFixed(0)} °C`,
        "warning",
      );
    }
    if (s.bathTempC > this.tapTargetTempC + C.TAP_SUPERHEAT_WINDOW_C) {
      this.raiseAlarm(
        "TAP_HOT",
        `Tappet varmt: ${s.bathTempC.toFixed(0)} °C mot mål ${this.tapTargetTempC.toFixed(0)} °C – sliter på ildfast`,
        "warning",
      );
    }
    return true;
  }

  /** Avslutt tapping: ovnen tippes tilbake og gjøres klar for ny charge. */
  finishTap(): boolean {
    const s = this.state;
    if (s.phase !== "tapping") return false;
    s.lastTapResult = this.buildTapResult();
    s.tiltDeg = 0;
    s.phase = "klargjoring";
    s.chargeRemainingKg = 0;
    s.conveyorRunning = false;
    return true;
  }

  private buildTapResult(): TapResult {
    const s = this.state;
    const grade = s.grade ?? DEFAULT_GRADE;
    const deviations: string[] = [];
    if (s.carbonPct > grade.tapCarbonMaxPct) {
      deviations.push(
        `C ${s.carbonPct.toFixed(3)} % over tappevindu ${grade.tapCarbonMaxPct.toFixed(2)} %`,
      );
    } else if (s.carbonPct < grade.tapCarbonMinPct) {
      deviations.push(
        `C ${s.carbonPct.toFixed(3)} % under tappevindu ${grade.tapCarbonMinPct.toFixed(2)} % – overblåst`,
      );
    }
    if (s.phosphorusPct > grade.phosphorusMaxPct) {
      deviations.push(
        `P ${s.phosphorusPct.toFixed(4)} % over maks ${grade.phosphorusMaxPct.toFixed(3)} %`,
      );
    }
    const tempDev = s.bathTempC - this.tapTargetTempC;
    if (Math.abs(tempDev) > C.TAP_SUPERHEAT_WINDOW_C) {
      deviations.push(`Temperatur ${tempDev >= 0 ? "+" : ""}${tempDev.toFixed(0)} °C fra mål`);
    }
    return {
      heat_number: s.heatNumber,
      grade: grade.code,
      tap_temp_c: round(s.bathTempC, 1),
      target_temp_c: round(this.tapTargetTempC, 1),
      carbon_pct: round(s.carbonPct, 3),
      phosphorus_pct: round(s.phosphorusPct, 4),
      feo_pct: round(this.slagPct("FeO"), 1),
      b2: round(this.b2, 2),
      energy_mwh: round(s.energyTotalMwh, 2),
      deviations,
      ok: deviations.length === 0,
    };
  }

  setTimeScale(scale: number): void {
    this.state.timeScale = clamp(scale, 0, 60);
  }

  reset(): void {
    this.resetFurnace();
  }

  // ---------------------------------------------------------------- //
  // Instruktørstyrt feilinjeksjon
  // ---------------------------------------------------------------- //
  injectFault(fault: string, payload: Record<string, unknown> = {}): void {
    const s = this.state;
    switch (fault) {
      case "electrode_break": {
        const idx =
          payload.electrode !== undefined
            ? Number(payload.electrode)
            : this.rng.randrange(s.electrodes.length);
        const e = s.electrodes[idx];
        if (!e) return;
        e.broken = true;
        e.currentKa = 0;
        e.voltageV = 0;
        this.raiseAlarm(`ELECTRODE_BREAK_${idx}`, `Elektrode ${idx + 1} er brukket`, "critical");
        if (s.powerOn && s.electrodes.every((el) => el.broken)) s.powerOn = false;
        break;
      }
      case "water_leak": {
        const circuit = String(payload.circuit ?? "hvelv");
        const c = s.cooling[circuit];
        if (c) {
          c.leaking = true;
          c.flowLossFraction = Number(payload.severity ?? 0.6);
        }
        break;
      }
      case "overslag":
        this.triggerOverslag();
        break;
      case "static_seal":
        s.staticSealOk = false;
        this.raiseAlarm(
          "STATIC_SEAL",
          "Static seal utett – falskluft reduserer forvarming av skrap",
          "warning",
        );
        break;
      case "high_phosphorus_scrap": {
        const value = Number(payload.value ?? 0.075);
        s.scrapPhosphorusPct = value;
        s.phosphorusPct = value;
        break;
      }
      case "dusty_hvelv":
        s.hvelvDustLevel = 1;
        break;
      case "new_pot":
        s.refractoryWear = 0;
        this.clearAlarm("REFRACTORY_WEAR");
        this.clearAlarm("REFRACTORY_BREAKTHROUGH");
        break;
      case "clear_all":
        for (const e of s.electrodes) e.broken = false;
        for (const c of Object.values(s.cooling)) {
          c.leaking = false;
          c.flowLossFraction = 0;
        }
        s.staticSealOk = true;
        s.refractoryWear = 0;
        for (const a of s.alarms) a.active = false;
        break;
      default:
        throw new Error(`ukjent feil: ${fault}`);
    }
  }

  /** Overslag: strømmen finner vei utenom stålbadet [kompendiet 1.5.4]. */
  private triggerOverslag(): void {
    const s = this.state;
    this.raiseAlarm("OVERSLAG", "Overslag fra elektrode – strøm på avveie", "critical");
    if (this.rng.random() < C.OVERSLAG_WATER_LEAK_PROBABILITY) {
      const circuit = this.rng.choice(Object.keys(s.cooling));
      s.cooling[circuit].leaking = true;
      s.cooling[circuit].flowLossFraction = this.rng.uniform(0.4, 0.8);
      this.raiseAlarm(
        `OVERSLAG_LEAK_${circuit}`,
        `Overslag traff vannkjølt element i '${circuit}' – vannlekkasje, vurder akutt stans`,
        "critical",
      );
    }
  }

  // ---------------------------------------------------------------- //
  // Simuleringssteg
  // ---------------------------------------------------------------- //
  step(dtS: number): void {
    const s = this.state;
    s.timeS += dtS;

    this.updateConveyor(dtS);
    this.updateElectrodes(dtS);
    this.updatePower(dtS);
    this.updateAdditions(dtS);
    const chemicalMw = this.updateOxygenChemistry(dtS);
    this.updateCarbonInjection(dtS);
    const meltMw = this.updateMelting(dtS);
    this.updateDephosphorization(dtS);
    this.updateSlagFoam(dtS);
    this.updateThermal(dtS, chemicalMw, meltMw);
    this.updateRefractory(dtS);
    this.updateDrainage(dtS);
    this.updateCooling();
    this.updateOffgas(dtS);
    this.updateElectrodeWear(dtS);
    this.updateOverslagRisk(dtS);
    this.updatePhase();
    this.updateAlarms();
  }

  // -- conveyor og forvarming ------------------------------------------
  private updateConveyor(dtS: number): void {
    const s = this.state;
    // Forvarmingsdelen henter varme fra avgassen. Lavere conveyorhastighet gir
    // lengre oppholdstid og varmere skrap [kompendiet 3.1/3.4].
    let targetPreheat: number;
    if (s.conveyorRunning && s.conveyorRateTMin > 0) {
      const speedRatio = s.conveyorRateTMin / C.CONVEYOR_MAX_RATE_T_MIN;
      const residenceFactor = 1 - 0.55 * speedRatio;
      const offgasFactor = Math.min(1, s.offgasTempC / C.OFFGAS_NOMINAL_TEMP_C);
      targetPreheat = C.PREHEAT_MAX_TEMP_C * residenceFactor * offgasFactor;
      if (!s.staticSealOk) targetPreheat *= 1 - C.STATIC_SEAL_FALSE_AIR_PENALTY;
    } else {
      targetPreheat = C.AMBIENT_TEMP_C;
    }
    s.preheatTempC += (targetPreheat - s.preheatTempC) * Math.min(1, dtS / 45);
    s.preheatTempC = Math.max(C.AMBIENT_TEMP_C, s.preheatTempC);

    if (!s.conveyorRunning || s.chargeRemainingKg <= 0) return;
    const fedKg = Math.min(s.chargeRemainingKg, (s.conveyorRateTMin * 1000 * dtS) / 60);
    if (fedKg <= 0) return;
    s.chargeRemainingKg -= fedKg;
    s.scrapChargedKg += fedKg;
    s.solidScrapKg += fedKg;

    // Skrapet bærer med seg oksider som havner i slaggen
    for (const [oxide, yieldPerKg] of Object.entries(C.SCRAP_OXIDE_YIELD)) {
      s.slag[oxide] = (s.slag[oxide] ?? 0) + fedKg * yieldPerKg;
    }
  }

  // -- elektroder --------------------------------------------------------
  private updateElectrodes(dtS: number): void {
    const s = this.state;
    for (const e of s.electrodes) {
      if (e.broken) {
        e.positionPct = 0;
        e.currentKa = 0;
        e.voltageV = 0;
        continue;
      }

      if (e.mode === "auto" && s.powerOn) {
        const targetCurrent =
          C.ELECTRODE_MAX_CURRENT_KA *
          (0.5 + (0.5 * s.transformerTap) / (C.TRANSFORMER_TAPS_V.length - 1));
        const error = targetCurrent - e.currentKa;
        e.targetPositionPct = clamp(e.targetPositionPct + C.AER_GAIN * error * dtS, 0, 100);
      } else if (!s.powerOn) {
        e.targetPositionPct = 0;
      }

      const maxStep = C.MAX_ELECTRODE_SPEED_PCT_PER_S * dtS;
      const delta = clamp(e.targetPositionPct - e.positionPct, -maxStep, maxStep);
      e.positionPct += delta;

      // Lavere elektrode gir kortere lysbuegap, altså mer strøm ved noe lavere
      // lysbuespenning
      if (s.powerOn && e.positionPct > 5) {
        const immersion = Math.min(1, e.positionPct / 100);
        const tapVoltage = C.TRANSFORMER_TAPS_V[s.transformerTap];
        const tapVoltageNorm = tapVoltage / C.TRANSFORMER_TAPS_V[C.TRANSFORMER_TAPS_V.length - 1];
        e.currentKa = C.ELECTRODE_MAX_CURRENT_KA * tapVoltageNorm * immersion;
        e.voltageV = (tapVoltage * (1 - 0.5 * immersion)) / Math.sqrt(3);
      } else {
        e.currentKa = 0;
        e.voltageV = 0;
      }
    }
  }

  private updatePower(dtS: number): void {
    const s = this.state;
    const totalMw = s.electrodes.reduce(
      (sum, e) => sum + (Math.sqrt(3) * e.voltageV * e.currentKa * C.ARC_POWER_FACTOR) / 1000,
      0,
    );
    s.electricalPowerMw = Math.min(totalMw, C.TRANSFORMER_RATED_MVA);
    s.energyTotalMwh += (s.electricalPowerMw * dtS) / 3600;
  }

  // -- tilsatser ---------------------------------------------------------
  private updateAdditions(dtS: number): void {
    const s = this.state;
    const minutes = dtS / 60;
    const feeds: [number, Record<string, number>, "limeTotalKg" | "dolomiteTotalKg" | null][] = [
      [s.limeRateKgMin, C.LIME_COMPOSITION, "limeTotalKg"],
      [s.dolomiteRateKgMin, C.DOLOMITE_COMPOSITION, "dolomiteTotalKg"],
      [s.magnesiteRateKgMin, C.MAGNESITE_COMPOSITION, null],
    ];
    for (const [rate, composition, totalKey] of feeds) {
      if (rate <= 0) continue;
      const added = rate * minutes;
      for (const [oxide, fraction] of Object.entries(composition)) {
        s.slag[oxide] = (s.slag[oxide] ?? 0) + added * fraction;
      }
      if (totalKey) s[totalKey] += added;
    }
  }

  // -- oksygenkjemi ------------------------------------------------------
  /** Blåser oksygen og fordeler det på C, Si, Mn og Fe. Returnerer kjemisk effekt i MW. */
  private updateOxygenChemistry(dtS: number): number {
    const s = this.state;
    if (s.oxygenFlowNm3h <= 0 || s.liquidMassKg <= 0) {
      s.chemicalPowerMw = 0;
      this.coGenerationKgS = 0;
      return 0;
    }

    const nm3 = (s.oxygenFlowNm3h * dtS) / 3600;
    s.oxygenTotalNm3 += nm3;
    let energyMj = 0;

    // Andelen av oksygenet som faktisk treffer karbon faller når badet er
    // karbonfattig, og da brennes mer jern -> FeO i slaggen stiger
    let decarbEff: number;
    if (s.carbonPct >= C.CARBON_PCT_FOR_FULL_DECARB) {
      decarbEff = C.DECARB_EFFICIENCY_AT_HIGH_C;
    } else {
      const ratio = Math.max(0, s.carbonPct / C.CARBON_PCT_FOR_FULL_DECARB);
      decarbEff =
        C.DECARB_EFFICIENCY_AT_LOW_C +
        ratio * (C.DECARB_EFFICIENCY_AT_HIGH_C - C.DECARB_EFFICIENCY_AT_LOW_C);
    }

    const o2ToCarbon = nm3 * decarbEff;
    const carbonBurned = Math.min(
      o2ToCarbon / C.O2_NM3_PER_KG_CARBON,
      (s.carbonPct / 100) * s.liquidMassKg,
    );
    s.carbonPct = Math.max(0, s.carbonPct - (carbonBurned / s.liquidMassKg) * 100);
    energyMj += carbonBurned * C.ENERGY_C_TO_CO_MJ_PER_KG_C;
    this.coGenerationKgS = (carbonBurned * (28 / 12)) / Math.max(dtS, 1e-6);

    let o2Rest = nm3 - o2ToCarbon;

    // Ellingham-rekkefølge: silisium oksiderer først, så mangan, så jern
    const siAvailable = (s.siliconPct / 100) * s.liquidMassKg;
    const siBurned = Math.min(siAvailable, (o2Rest * 0.35) / O2_NM3_PER_KG_SI);
    if (siBurned > 0) {
      s.siliconPct = Math.max(0, s.siliconPct - (siBurned / s.liquidMassKg) * 100);
      s.slag.SiO2 += siBurned * OXIDE_FACTOR.SiO2;
      energyMj += siBurned * C.ENERGY_SI_OXIDATION_MJ_PER_KG_SI;
      o2Rest -= siBurned * O2_NM3_PER_KG_SI;
    }

    const mnAvailable = (s.manganesePct / 100) * s.liquidMassKg;
    const mnBurned = Math.min(mnAvailable, (Math.max(0, o2Rest) * 0.25) / O2_NM3_PER_KG_MN);
    if (mnBurned > 0) {
      s.manganesePct = Math.max(0, s.manganesePct - (mnBurned / s.liquidMassKg) * 100);
      s.slag.MnO += mnBurned * OXIDE_FACTOR.MnO;
      energyMj += mnBurned * C.ENERGY_MN_OXIDATION_MJ_PER_KG_MN;
      o2Rest -= mnBurned * O2_NM3_PER_KG_MN;
    }

    if (o2Rest > 0) {
      const feBurned = Math.min(o2Rest / O2_NM3_PER_KG_FE, s.liquidMassKg * 0.01);
      s.liquidMassKg -= feBurned;
      s.slag.FeO += feBurned * OXIDE_FACTOR.FeO;
      energyMj += feBurned * C.ENERGY_FE_OXIDATION_MJ_PER_KG_FE;
    }

    const chemicalMw = energyMj / Math.max(dtS, 1e-6);
    s.chemicalPowerMw = chemicalMw;
    s.energyTotalMwh += (chemicalMw * dtS) / 3600;
    return chemicalMw;
  }

  /** Innblåst karbon reduserer FeO i slaggen til CO-gass og løser seg delvis i badet. */
  private updateCarbonInjection(dtS: number): void {
    const s = this.state;
    if (s.carbonInjectionKgMin <= 0) {
      this.foamCoKgS = this.coGenerationKgS;
      return;
    }
    const injected = (s.carbonInjectionKgMin * dtS) / 60;
    s.carbonTotalKg += injected;

    // FeO + C -> Fe + CO. Reaksjonen bremser når slaggen er fattig på FeO,
    // slik at FeO-nivået finner en likevekt mot oksygeninnblåsingen.
    const feoAvailable = s.slag.FeO ?? 0;
    const reactionFraction = 0.3 * Math.min(1, this.slagPct("FeO") / C.FEO_TARGET_PCT);
    const cForSlag = Math.min(injected * reactionFraction, (feoAvailable * 12) / 72);
    const feoReduced = (cForSlag * 72) / 12;
    s.slag.FeO = Math.max(0, feoAvailable - feoReduced);
    s.liquidMassKg += (feoReduced * 56) / 72;
    const coFromSlag = (cForSlag * 28) / 12;

    // Bare en liten del av det innblåste karbonet løser seg i badet; resten
    // forbrennes i slagg og avgass
    const cDissolved = (injected - cForSlag) * 0.15;
    if (s.liquidMassKg > 0) s.carbonPct += (cDissolved / s.liquidMassKg) * 100;

    this.foamCoKgS = this.coGenerationKgS + coFromSlag / Math.max(dtS, 1e-6);
  }

  // -- smelting -----------------------------------------------------------
  /** Flatbad-smelting: stålsumpen smelter skrapet som mates inn. Returnerer smelteeffekt i MW. */
  private updateMelting(dtS: number): number {
    const s = this.state;
    if (s.solidScrapKg <= 0 || s.liquidMassKg <= 0) return 0;

    const superheat = s.bathTempC - this.liquidusC;
    if (superheat <= 0) return 0;

    const contact = Math.min(1, s.solidScrapKg / MELT_CONTACT_REFERENCE_KG);
    const meltPowerMw = MELT_HEAT_TRANSFER_MW_PER_K * superheat * contact;

    const energyPerKg =
      C.CP_SOLID_STEEL_KJ_KG_K * Math.max(0, this.liquidusC - s.preheatTempC) +
      C.LATENT_HEAT_FUSION_KJ_KG;
    const meltedKg = Math.min(s.solidScrapKg, (meltPowerMw * 1000 * dtS) / energyPerKg);
    s.solidScrapKg -= meltedKg;
    s.liquidMassKg += meltedKg;

    // Skrapet fortynner badet med sin egen kjemi
    if (s.liquidMassKg > 0 && meltedKg > 0) {
      const frac = meltedKg / s.liquidMassKg;
      s.carbonPct += (C.CARBON_FROM_SCRAP_PCT - s.carbonPct) * frac;
      s.phosphorusPct += (s.scrapPhosphorusPct - s.phosphorusPct) * frac;
      s.siliconPct += (0.15 - s.siliconPct) * frac;
      s.manganesePct += (0.2 - s.manganesePct) * frac;
    }

    return (meltedKg * energyPerKg) / 1000 / Math.max(dtS, 1e-6);
  }

  // -- avfosforering ------------------------------------------------------
  /** Fosfor går mellom stål og slagg avhengig av FeO, basisitet og temperatur.
   *
   * Avfosforering favoriseres av oksiderende, basisk slagg og lav temperatur.
   * Kjøres temperaturen opp mens den fosforrike slaggen fortsatt ligger i ovnen,
   * går reaksjonen motsatt vei og fosforet kommer tilbake i stålet (fosforbom). */
  private updateDephosphorization(dtS: number): void {
    const s = this.state;
    if (s.liquidMassKg <= 0) return;

    const feoFactor = Math.min(2, this.slagPct("FeO") / C.FEO_TARGET_PCT);
    const basicityFactor = this.b2 > 0 ? Math.min(1.6, this.b2 / C.B2_TARGET) : 0;
    const tempFactor = Math.exp((C.DEPHOS_TEMP_REFERENCE_C - s.bathTempC) / 65);
    const drive = feoFactor * basicityFactor * tempFactor;

    const pEq = P_EQUILIBRIUM_BASE_PCT / Math.max(drive, 0.03);
    const deltaPct = (s.phosphorusPct - pEq) * C.DEPHOS_RATE_CONSTANT * dtS;

    if (deltaPct > 0) {
      // Fosfor ut av stålet og opp i slaggen
      const pKg = (deltaPct / 100) * s.liquidMassKg;
      s.phosphorusPct -= deltaPct;
      s.slag.P2O5 = (s.slag.P2O5 ?? 0) + pKg * OXIDE_FACTOR.P2O5;
    } else {
      // Tilbakereaksjon: begrenset av hvor mye fosfor som faktisk ligger i slaggen
      const pInSlagKg = (s.slag.P2O5 ?? 0) / OXIDE_FACTOR.P2O5;
      const wantedKg = Math.min((-deltaPct / 100) * s.liquidMassKg, pInSlagKg);
      if (wantedKg > 0) {
        s.phosphorusPct += (wantedKg / s.liquidMassKg) * 100;
        s.slag.P2O5 -= wantedKg * OXIDE_FACTOR.P2O5;
      }
    }
  }

  // -- skumslagg -----------------------------------------------------------
  /** Skumslagg krever CO-utvikling og riktig viskositet (B2 nær målet). */
  private updateSlagFoam(dtS: number): void {
    const s = this.state;
    const coRate = this.foamCoKgS;
    const viscosityOk =
      this.slagMassKg < 500 ? 0 : Math.exp(-(((this.b2 - C.B2_TARGET) / C.B2_WINDOW) ** 2));
    const growth = 0.35 * Math.min(1, coRate / 1.2) * viscosityOk;
    const decay = 0.02 + (s.slagDoorOpen ? 0.06 : 0);
    s.slagFoamIndex = clamp(s.slagFoamIndex + (growth - decay) * dtS, 0, 1);
  }

  // -- varmebalanse ---------------------------------------------------------
  private updateThermal(dtS: number, chemicalMw: number, meltMw: number): void {
    const s = this.state;
    if (s.liquidMassKg <= 0) return;

    const shield = 1 - C.FOAM_SHIELD_MAX_REDUCTION * s.slagFoamIndex;
    // Strålingstapet vokser kraftig med temperaturen
    const radiationFactor = ((s.bathTempC + 273) / 1873) ** 3.5;
    let wallLossMw = C.NOMINAL_WALL_ROOF_LOSS_MW * shield * radiationFactor;
    if (s.slagDoorOpen) wallLossMw += C.DOOR_OPEN_EXTRA_LOSS_MW;
    if (!s.powerOn) wallLossMw *= 0.45;

    // Avgassen bærer med seg følbar varme, mest når det mates kaldt skrap.
    // Et varmere bad gir varmere avgass og dermed raskt økende tap.
    let offgasLossMw = 2 + 3.5 * (s.powerOn ? 1 : 0.2);
    if (s.conveyorRunning) offgasLossMw += 1.5;
    const superheatOverTarget = s.bathTempC - this.tapTargetTempC;
    if (superheatOverTarget > 0) offgasLossMw += 0.09 * superheatOverTarget;

    const netMw = s.electricalPowerMw + chemicalMw - wallLossMw - offgasLossMw - meltMw;
    const heatCapacityKjK = s.liquidMassKg * C.CP_LIQUID_STEEL_KJ_KG_K;
    s.bathTempC += (netMw * 1000 * dtS) / heatCapacityKjK;
    s.bathTempC = Math.max(C.AMBIENT_TEMP_C, s.bathTempC);
  }

  // -- ildfast ----------------------------------------------------------------
  /** Ildfasten slites av drift, og mye fortere når stålet er for varmt.
   *
   * Kjøres badet langt over tappetemperatur lenge nok, går det hull på potta
   * og chargen må avbrytes. */
  private updateRefractory(dtS: number): void {
    const s = this.state;
    let wear = 0;
    if (s.powerOn) wear += C.REFRACTORY_BASE_WEAR_PER_S * dtS;
    const excess = s.bathTempC - C.BATH_TEMP_CRITICAL_C;
    if (excess > 0) wear += C.REFRACTORY_HOT_WEAR_PER_K_S * excess * dtS;
    // Skumslagg beskytter steinen mot strålevarmen fra lysbuen
    wear *= 1 - 0.4 * s.slagFoamIndex;
    s.refractoryWear = Math.min(1, s.refractoryWear + wear);

    if (s.refractoryWear >= 1) {
      this.raiseAlarm(
        "REFRACTORY_BREAKTHROUGH",
        "Gjennombrenning i ovnspotta – chargen må avbrytes og potta byttes",
        "critical",
      );
      s.powerOn = false;
      s.conveyorRunning = false;
    } else if (s.refractoryWear > 0.7) {
      this.raiseAlarm(
        "REFRACTORY_WEAR",
        `Kraftig slitasje på ildfast (${(s.refractoryWear * 100).toFixed(0)} %) – senk temperaturen`,
        "warning",
      );
    }
  }

  // -- tapping og avslagging -------------------------------------------------
  private updateDrainage(dtS: number): void {
    const s = this.state;

    // Avslagging: ovnen tippes mot slaggdøra og slaggen renner ut
    if (s.tiltDeg <= C.SLAG_POSITION_DEG + 1 && s.slagDoorOpen) {
      const drained = C.SLAG_DRAIN_KG_S * dtS;
      const total = this.slagMassKg;
      if (total > 0) {
        const fraction = Math.min(1, drained / total);
        for (const oxide of Object.keys(s.slag)) s.slag[oxide] *= 1 - fraction;
        s.slagFoamIndex *= 1 - fraction;
      }
    }

    // Tapping: stålet renner i øsa, men stålsumpen blir igjen i ovnen
    if (s.phase === "tapping" && s.tiltDeg >= C.TAP_POSITION_DEG - 1) {
      const tappable = Math.max(0, s.liquidMassKg - C.HEEL_MASS_KG);
      if (tappable > 0) s.liquidMassKg -= Math.min(tappable, C.TAP_HOLE_DRAIN_KG_S * dtS);
    }
  }

  // -- kjølevann ------------------------------------------------------------
  private updateCooling(): void {
    const s = this.state;
    for (const c of Object.values(s.cooling)) {
      c.flowLpm = c.nominalFlowLpm * (1 - c.flowLossFraction);
      const share = C.COOLING_CIRCUITS[c.name].lossShare;
      const heatMw = C.NOMINAL_WALL_ROOF_LOSS_MW * share * (s.powerOn ? 1 : 0.25);
      const massFlowKgS = (c.flowLpm * C.WATER_DENSITY_KG_L) / 60;
      c.deltaTC = massFlowKgS > 0.05 ? (heatMw * 1000) / (massFlowKgS * C.CP_WATER_KJ_KG_K) : 99;
    }
  }

  // -- avgass ---------------------------------------------------------------
  private updateOffgas(dtS: number): void {
    const s = this.state;
    let target: number;
    if (s.powerOn) {
      target = C.OFFGAS_NOMINAL_TEMP_C;
      if (s.oxygenFlowNm3h > 0) {
        target += 250 * Math.min(1, s.oxygenFlowNm3h / C.OXYGEN_MAX_NM3_H);
      }
      if (s.slagDoorOpen) target += 150;
      target = Math.min(C.OFFGAS_MAX_TEMP_C, target);
    } else {
      target = 200;
    }
    s.offgasTempC += (target - s.offgasTempC) * Math.min(1, dtS / 40);

    const targetCo = Math.min(30, this.foamCoKgS * 12);
    s.offgasCoPct += (targetCo - s.offgasCoPct) * Math.min(1, dtS / 25);
  }

  // -- elektrodeslitasje ------------------------------------------------------
  private updateElectrodeWear(dtS: number): void {
    const s = this.state;
    const coolingBenefit = 0.5 * (s.electrodeCoolingPct / 100);
    for (const e of s.electrodes) {
      if (e.broken) continue;
      let wearM = 0;
      if (s.powerOn) {
        // Sideoksidasjon: oksygen reagerer med glødende elektrode, dempes av kjøling
        wearM += (C.ELECTRODE_SIDE_OXIDATION_M_PER_H * (1 - coolingBenefit) * dtS) / 3600;
        // Tippfordamping: karbonet fordamper i lysbueområdet
        const arcMwh =
          (((Math.sqrt(3) * e.voltageV * e.currentKa * C.ARC_POWER_FACTOR) / 1000) * dtS) / 3600;
        wearM += C.ELECTRODE_TIP_VAPORIZATION_M_PER_MWH * arcMwh;
      }
      e.lengthM = Math.max(0, e.lengthM - wearM);
      e.consumedM += wearM;

      // Tippbrudd: når nippelen nærmer seg lysbuen sprekker tippen
      if (e.lengthM < C.ELECTRODE_MIN_LENGTH_M && s.powerOn) {
        const risk = 0.0008 * dtS * (C.ELECTRODE_MIN_LENGTH_M - e.lengthM);
        if (this.rng.random() < risk) this.injectFault("electrode_break", { electrode: e.index });
      }
    }
  }

  // -- overslag ---------------------------------------------------------------
  private updateOverslagRisk(dtS: number): void {
    const s = this.state;
    if (!s.powerOn) return;
    s.hvelvDustLevel = Math.min(1, s.hvelvDustLevel + 0.00004 * dtS);
    const risk =
      C.OVERSLAG_BASE_RISK_PER_S *
      (1 + C.OVERSLAG_COOLING_FACTOR * (s.electrodeCoolingPct / 100)) *
      (1 + C.OVERSLAG_DUST_FACTOR * s.hvelvDustLevel) *
      dtS;
    if (this.rng.random() < risk) this.triggerOverslag();
  }

  // -- faselogikk ---------------------------------------------------------------
  private updatePhase(): void {
    const s = this.state;
    if (s.phase === "innsmelting") {
      if (s.chargeRemainingKg <= 0 && s.solidScrapKg < 500) s.phase = "raffinering";
    } else if (s.phase === "raffinering" || s.phase === "avslagging") {
      const deslagging = s.tiltDeg <= C.SLAG_POSITION_DEG + 1 && s.slagDoorOpen;
      s.phase = deslagging ? "avslagging" : "raffinering";
    } else if (s.phase === "tapping") {
      if (s.liquidMassKg <= C.HEEL_MASS_KG + 1) this.finishTap();
    }
  }

  // -- alarmer ---------------------------------------------------------------
  private updateAlarms(): void {
    const s = this.state;
    for (const c of Object.values(s.cooling)) {
      const code = `COOLING_HIGH_DT_${c.name}`;
      if (c.deltaTC > C.COOLING_DELTA_T_CRITICAL_C) {
        this.raiseAlarm(
          code,
          `Høy delta-T i kjølekrets '${c.name}' – fare for panelskade`,
          "critical",
        );
      } else if (c.deltaTC < C.COOLING_DELTA_T_WARNING_C) {
        this.clearAlarm(code);
      }
    }

    if (s.bathTempC > C.BATH_TEMP_CRITICAL_C) {
      this.raiseAlarm(
        "BATH_TOO_HOT",
        `Badet er ${s.bathTempC.toFixed(0)} °C – for varmt, sliter hardt på ildfast`,
        "critical",
      );
    } else if (s.bathTempC < C.BATH_TEMP_CRITICAL_C - 40) {
      this.clearAlarm("BATH_TOO_HOT");
    }

    if (s.offgasTempC > C.OFFGAS_MAX_TEMP_C - 50) {
      this.raiseAlarm("OFFGAS_HOT", "Høy avgasstemperatur – belaster renseanlegget", "warning");
    } else if (s.offgasTempC < C.OFFGAS_MAX_TEMP_C - 200) {
      this.clearAlarm("OFFGAS_HOT");
    }

    if (s.offgasCoPct > 20) {
      this.raiseAlarm("OFFGAS_CO", "Høyt CO-nivå i avgass", "warning");
    } else if (s.offgasCoPct < 12) {
      this.clearAlarm("OFFGAS_CO");
    }

    // Slagg utenfor vindu gir dårlig skumming og økt slitasje på ildfast
    if (this.slagMassKg > 1500) {
      if (this.b2 < C.B2_TARGET - C.B2_WINDOW) {
        this.raiseAlarm(
          "SLAG_B2_LOW",
          `B2 ${this.b2.toFixed(2)} er lav – for sur slagg, øk kalktilsats`,
          "warning",
        );
        this.clearAlarm("SLAG_B2_HIGH");
      } else if (this.b2 > C.B2_TARGET + C.B2_WINDOW) {
        this.raiseAlarm(
          "SLAG_B2_HIGH",
          `B2 ${this.b2.toFixed(2)} er høy – stiv slagg, dårlig skumming`,
          "warning",
        );
        this.clearAlarm("SLAG_B2_LOW");
      } else {
        this.clearAlarm("SLAG_B2_LOW");
        this.clearAlarm("SLAG_B2_HIGH");
      }
    }

    const grade = s.grade;
    if (grade && (s.phase === "raffinering" || s.phase === "avslagging")) {
      if (s.phosphorusPct > grade.phosphorusMaxPct) {
        this.raiseAlarm(
          "P_OVER_LIMIT",
          `Fosfor ${s.phosphorusPct.toFixed(4)} % over kravet for ${grade.code}`,
          "warning",
        );
      } else {
        this.clearAlarm("P_OVER_LIMIT");
      }
    }

    // Lysbuen går uten skumslagg: stråler rett på ildfast og vannkjølte paneler
    if (s.powerOn && s.slagFoamIndex < 0.15 && s.electricalPowerMw > 25) {
      this.raiseAlarm(
        "NO_FOAM",
        "Lysbue uten skumslagg – strålevarme mot ildfast, øk karbon/oksygen",
        "warning",
      );
    } else if (s.slagFoamIndex > 0.3 || !s.powerOn) {
      this.clearAlarm("NO_FOAM");
    }

    for (const e of s.electrodes) {
      const code = `ELECTRODE_SHORT_${e.index}`;
      if (!e.broken && e.lengthM < C.ELECTRODE_MIN_LENGTH_M) {
        this.raiseAlarm(
          code,
          `Elektrode ${e.index + 1} er kort (${e.lengthM.toFixed(1)} m) – bør skjøtes`,
          "warning",
        );
      } else {
        this.clearAlarm(code);
      }
    }
  }
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
