import type { LogLink } from "../game/types";

/** Teksten på knappen til et varsel med lenke (B-453, B-501), i varsellista og for skjermlesere på varsellinja */
export const LINK_LABEL: Record<LogLink, string> = {
  industri: "Gå til selskapet",
  konsern: "Svar verksjefen",
  folk: "Gå til skiftene",
  ansett: "Gå til søkerne",
};
