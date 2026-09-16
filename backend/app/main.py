from __future__ import annotations

import asyncio
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .simulation import constants as C
from .simulation.eaf import EAFSimulation
from .simulation.grades import GRADES
from .simulation.model import RegulationMode
from .simulation.scenarios import SCENARIOS, get_scenario
from .simulation.serialize import state_to_dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stalovn_simulator")

app = FastAPI(title="Stålovn Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sim = EAFSimulation()
clients: set[WebSocket] = set()

TICK_INTERVAL_S = 1.0 / C.DEFAULT_TICK_HZ


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/scenarios")
def list_scenarios():
    return [
        {"id": s.id, "name": s.name, "briefing": s.briefing, "grade": s.grade}
        for s in SCENARIOS
    ]


@app.get("/api/grades")
def list_grades():
    return [
        {
            "code": g.code,
            "name": g.name,
            "tap_carbon_min_pct": g.tap_carbon_min_pct,
            "tap_carbon_max_pct": g.tap_carbon_max_pct,
            "phosphorus_max_pct": g.phosphorus_max_pct,
            "final_carbon_pct": g.final_carbon_pct,
        }
        for g in GRADES
    ]


def _apply_operator_command(action: str, payload: dict) -> None:
    value = payload.get("value")
    if action == "set_power":
        sim.set_power(bool(value))
    elif action == "set_transformer_tap":
        sim.set_transformer_tap(int(value))
    elif action == "set_regulation_mode":
        mode = RegulationMode.AUTO if value == "auto" else RegulationMode.MANUAL
        sim.set_regulation_mode(int(payload.get("electrode", 0)), mode)
    elif action == "set_electrode_position":
        sim.set_electrode_position(int(payload.get("electrode", 0)), float(value))
    elif action == "set_electrode_cooling":
        sim.set_electrode_cooling(float(value))
    elif action == "start_charge":
        sim.start_charge(payload.get("grade"))
    elif action == "set_conveyor":
        sim.set_conveyor(bool(value))
    elif action == "set_conveyor_rate":
        sim.set_conveyor_rate(float(value))
    elif action == "set_lime_rate":
        sim.set_lime_rate(float(value))
    elif action == "set_dolomite_rate":
        sim.set_dolomite_rate(float(value))
    elif action == "set_magnesite_rate":
        sim.set_magnesite_rate(float(value))
    elif action == "set_carbon_injection":
        sim.set_carbon_injection(float(value))
    elif action == "set_oxygen_flow":
        sim.set_oxygen_flow(float(value))
    elif action == "set_slag_door":
        sim.set_slag_door(bool(value))
    elif action == "set_tilt":
        sim.set_tilt(float(value))
    elif action == "vacuum_hvelv":
        sim.vacuum_hvelv()
    elif action == "start_tap":
        sim.start_tap()
    elif action == "finish_tap":
        sim.finish_tap()
    elif action == "ack_alarm":
        sim.ack_alarm(int(payload.get("id", 0)))
    elif action == "set_time_scale":
        sim.set_time_scale(float(value))
    elif action == "reset":
        sim.reset()
    else:
        logger.warning("ukjent operatørkommando: %s", action)


def _apply_instructor_command(action: str, payload: dict) -> None:
    if action == "inject_fault":
        kwargs = {k: v for k, v in payload.items() if k != "fault"}
        sim.inject_fault(payload["fault"], **kwargs)
    elif action == "load_scenario":
        scenario = get_scenario(payload.get("id", ""))
        if scenario is None:
            logger.warning("ukjent scenario: %s", payload.get("id"))
            return
        sim.reset()
        sim.state.scenario = scenario.id
        sim.start_charge(scenario.grade)
        for fault in scenario.initial_faults:
            fault_kwargs = {k: v for k, v in fault.items() if k != "fault"}
            sim.inject_fault(fault["fault"], **fault_kwargs)
    else:
        logger.warning("ukjent instruktørkommando: %s", action)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    clients.add(websocket)
    logger.info("klient tilkoblet, totalt=%d", len(clients))
    try:
        await websocket.send_text(json.dumps({"type": "state", **state_to_dict(sim)}))
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            msg_type = msg.get("type")
            action = msg.get("action")
            payload = msg.get("payload", {})
            if msg_type == "command" and action:
                _apply_operator_command(action, payload)
            elif msg_type == "instructor" and action:
                _apply_instructor_command(action, payload)
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(websocket)
        logger.info("klient frakoblet, totalt=%d", len(clients))


async def _broadcast(message: dict) -> None:
    if not clients:
        return
    data = json.dumps(message)
    dead = []
    for ws in clients:
        try:
            await ws.send_text(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)


async def _simulation_loop() -> None:
    while True:
        await asyncio.sleep(TICK_INTERVAL_S)
        dt_s = TICK_INTERVAL_S * sim.state.time_scale
        if dt_s > 0:
            sim.step(dt_s)
        await _broadcast({"type": "state", **state_to_dict(sim)})


@app.on_event("startup")
async def on_startup() -> None:
    asyncio.create_task(_simulation_loop())
