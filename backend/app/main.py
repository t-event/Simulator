from __future__ import annotations

import asyncio
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .simulation.eaf import EAFSimulation
from .simulation.model import RegulationMode
from .simulation.scenarios import SCENARIOS, get_scenario
from .simulation.serialize import state_to_dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eaf_simulator")

app = FastAPI(title="Stålovn Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

sim = EAFSimulation()
clients: set[WebSocket] = set()

TICK_HZ = 4
TICK_INTERVAL_S = 1.0 / TICK_HZ


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/scenarios")
def list_scenarios():
    return [
        {"id": s.id, "name": s.name, "briefing": s.briefing} for s in SCENARIOS
    ]


def _apply_operator_command(action: str, payload: dict) -> None:
    if action == "set_power":
        sim.set_power(bool(payload.get("value")))
    elif action == "set_transformer_tap":
        sim.set_transformer_tap(int(payload.get("value", 0)))
    elif action == "set_regulation_mode":
        mode = RegulationMode.AUTO if payload.get("value") == "auto" else RegulationMode.MANUAL
        sim.set_regulation_mode(int(payload.get("electrode", 0)), mode)
    elif action == "set_electrode_position":
        sim.set_electrode_position(int(payload.get("electrode", 0)), float(payload.get("value", 0)))
    elif action == "set_oxygen_flow":
        sim.set_oxygen_flow(float(payload.get("value", 0)))
    elif action == "set_carbon_injection":
        sim.set_carbon_injection(float(payload.get("value", 0)))
    elif action == "set_burner":
        sim.set_burner(bool(payload.get("value")))
    elif action == "set_door_open":
        sim.set_door_open(bool(payload.get("value")))
    elif action == "set_tilt":
        sim.set_tilt(float(payload.get("value", 0)))
    elif action == "set_time_scale":
        sim.set_time_scale(float(payload.get("value", 1)))
    elif action == "charge_scrap":
        sim.charge_scrap()
    elif action == "start_tap":
        sim.start_tap()
    elif action == "finish_tap":
        sim.finish_tap()
    elif action == "ack_alarm":
        sim.ack_alarm(int(payload.get("id", 0)))
    elif action == "reset":
        sim.reset()
    else:
        logger.warning("unknown operator action: %s", action)


def _apply_instructor_command(action: str, payload: dict) -> None:
    if action == "inject_fault":
        kwargs = {k: v for k, v in payload.items() if k != "fault"}
        sim.inject_fault(payload["fault"], **kwargs)
    elif action == "load_scenario":
        scenario = get_scenario(payload.get("id", ""))
        if scenario is None:
            logger.warning("unknown scenario: %s", payload.get("id"))
            return
        sim.reset()
        sim.state.scenario = scenario.id
        for fault in scenario.initial_faults:
            fault_kwargs = {k: v for k, v in fault.items() if k != "fault"}
            sim.inject_fault(fault["fault"], **fault_kwargs)
    else:
        logger.warning("unknown instructor action: %s", action)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    clients.add(websocket)
    logger.info("client connected, total=%d", len(clients))
    try:
        await websocket.send_text(json.dumps({"type": "state", **state_to_dict(sim.state)}))
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
        logger.info("client disconnected, total=%d", len(clients))


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
        await _broadcast({"type": "state", **state_to_dict(sim.state)})


@app.on_event("startup")
async def on_startup() -> None:
    asyncio.create_task(_simulation_loop())
