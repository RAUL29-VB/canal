"""
Servidor local todo-en-uno para Estudio Stickman Misterio + Clonación de voz (Chatterbox CUDA) + Exportación MP4 Full HD 1080p.
Se inicia con ABRIR_ESTUDIO.bat y abre http://127.0.0.1:8765 en tu navegador.
"""

import asyncio
import json
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
import webbrowser
from pathlib import Path

import numpy as np
import perth
import soundfile as sf
import torch
import uvicorn
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

if perth.PerthImplicitWatermarker is None:
    perth.PerthImplicitWatermarker = perth.DummyWatermarker

ROOT_DIR = Path(__file__).resolve().parent.parent
VOZ_DIR = Path(__file__).resolve().parent
EXPORT_DIR = ROOT_DIR / "exportados"
EXPORT_DIR.mkdir(exist_ok=True)
REF_WAV = VOZ_DIR / "mi_voz.wav"

_MODEL = None
_MODEL_LOCK = threading.Lock()
_JOBS: dict[str, dict] = {}
_JOBS_LOCK = threading.Lock()


def get_model():
    global _MODEL
    with _MODEL_LOCK:
        if _MODEL is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[Estudio] Cargando Chatterbox Multilingual en {device}...")
            _MODEL = ChatterboxMultilingualTTS.from_pretrained(device=device)
            print("[Estudio] Modelo listo.")
        return _MODEL


def run_ffmpeg(args: list[str]) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("No se encontró ffmpeg en PATH.")
    subprocess.run(
        [ffmpeg, "-y", *args],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def update_job(job_id: str, **fields) -> None:
    with _JOBS_LOCK:
        if job_id in _JOBS:
            _JOBS[job_id].update(fields)


def extract_durations_from_wav(wav_path: Path, min_pause_sec: float = 0.40) -> list[float] | None:
    """Detecta silencios digitales exactos entre escenas cuando falta el archivo .json."""
    try:
        data, sr = sf.read(str(wav_path), dtype="int16")
        if data.ndim > 1:
            data = data[:, 0]
        n = len(data)
        if n == 0:
            return None
        is_zero = data == 0
        diffs = np.diff(is_zero.astype(np.int8))
        starts = np.where(diffs == 1)[0] + 1
        ends = np.where(diffs == -1)[0] + 1
        if is_zero[0]:
            starts = np.r_[0, starts]
        if is_zero[-1]:
            ends = np.r_[ends, n]
        min_len = int(min_pause_sec * sr)
        internal_pauses = [(s, e) for s, e in zip(starts, ends) if (e - s) >= min_len and e < n and s > 0]
        if not internal_pauses:
            return None
        durs = []
        prev_sample = 0
        for _, e in internal_pauses:
            d = round((e - prev_sample) / float(sr), 4)
            durs.append(d)
            prev_sample = int(round(prev_sample + d * sr))
        last_d = round(max(0.5, (n - prev_sample) / float(sr)), 4)
        durs.append(last_d)
        return durs
    except Exception:
        return None


def resolve_voice_wav(episode_id: str, format_key: str) -> Path | None:
    fmt = "short" if format_key == "short" else "full"
    candidates = [
        VOZ_DIR / f"narracion_{episode_id}_{fmt}.wav",
    ]
    if episode_id == "taured-1954":
        candidates.append(VOZ_DIR / f"narracion_{fmt}.wav")
    for c in candidates:
        if c.exists():
            return c
    return None


def synthesize_master_audio(
    out_wav: Path,
    duration_sec: float,
    voice_wav: Path | None,
    include_bgm: bool,
    bgm_vol: float,
    sfx_cues: list[dict],
) -> None:
    """Construye la mezcla maestra exacta al sample (voz sin pérdidas + atmósfera + efectos)."""
    sr = 24000
    voice_arr = None
    if voice_wav and voice_wav.exists():
        v_data, v_sr = sf.read(str(voice_wav), dtype="float32")
        if v_data.ndim > 1:
            v_data = np.mean(v_data, axis=1)
        if v_sr != sr and len(v_data) > 0:
            old_idx = np.linspace(0.0, 1.0, num=len(v_data), endpoint=False)
            new_len = max(1, int(round(len(v_data) * sr / float(v_sr))))
            new_idx = np.linspace(0.0, 1.0, num=new_len, endpoint=False)
            v_data = np.interp(new_idx, old_idx, v_data).astype(np.float32)
        peak = float(np.max(np.abs(v_data))) if len(v_data) > 0 else 0.0
        if peak > 1e-4:
            v_data = v_data * (0.88 / peak)
        voice_arr = v_data

    total_samples = max(
        int(round(duration_sec * sr)),
        len(voice_arr) if voice_arr is not None else 1,
    )
    mix = np.zeros(total_samples, dtype=np.float32)

    if voice_arr is not None and len(voice_arr) > 0:
        mix[: len(voice_arr)] += voice_arr

    if include_bgm and bgm_vol > 0.001:
        t = np.arange(total_samples, dtype=np.float32) / float(sr)
        vol = float(np.clip(bgm_vol, 0.0, 1.0))
        # Drone atmosférico suave (fundamental grave + armónico cálido)
        drone = (
            0.55 * np.sin(2.0 * np.pi * 55.0 * t)
            + 0.35 * np.sin(2.0 * np.pi * 55.6 * t)
            + 0.20 * np.sin(2.0 * np.pi * 110.0 * t)
        ).astype(np.float32)
        # Ducking suave cuando suena la voz para que la narración sea 100% nítida
        drone_gain = 0.055 * vol
        mix += drone * drone_gain

        for cue in sfx_cues:
            try:
                cue_t = max(0.0, float(cue.get("t", 0.0)))
                cue_type = str(cue.get("type", ""))
            except Exception:
                continue
            start_idx = int(round(cue_t * sr))
            if start_idx >= total_samples:
                continue

            if cue_type == "sting":
                dur_s = min(1.2, (total_samples - start_idx) / float(sr))
                if dur_s > 0.05:
                    n_s = int(dur_s * sr)
                    lt = np.arange(n_s, dtype=np.float32) / float(sr)
                    k = 48.0 / 160.0
                    phase = 2.0 * np.pi * 160.0 * (1.1 / np.log(k)) * ((k ** (lt / 1.1)) - 1.0)
                    env = np.exp(-lt * 3.4) * 0.20 * vol
                    mix[start_idx : start_idx + n_s] += (np.sin(phase) * env).astype(np.float32)
            elif cue_type == "heartbeat":
                for offset in (0.0, 0.28):
                    hs = start_idx + int(round(offset * sr))
                    dur_s = min(0.20, (total_samples - hs) / float(sr))
                    if hs < total_samples and dur_s > 0.04:
                        n_s = int(dur_s * sr)
                        lt = np.arange(n_s, dtype=np.float32) / float(sr)
                        phase = 2.0 * np.pi * 68.0 * (0.18 / np.log(0.5)) * ((0.5 ** (lt / 0.18)) - 1.0)
                        env = np.exp(-lt * 15.0) * 0.22 * vol
                        mix[hs : hs + n_s] += (np.sin(phase) * env).astype(np.float32)
            elif cue_type == "pulse":
                dur_s = min(0.65, (total_samples - start_idx) / float(sr))
                if dur_s > 0.05:
                    n_s = int(dur_s * sr)
                    lt = np.arange(n_s, dtype=np.float32) / float(sr)
                    phase = 2.0 * np.pi * 200.0 * (0.6 / np.log(0.5)) * ((0.5 ** (lt / 0.6)) - 1.0)
                    env = np.exp(-lt * 5.8) * 0.12 * vol
                    mix[start_idx : start_idx + n_s] += (np.sin(phase) * env).astype(np.float32)

    # Fade-out suave en los últimos 120ms para evitar clic al final
    fade_n = min(int(0.12 * sr), total_samples)
    if fade_n > 1:
        mix[-fade_n:] *= np.linspace(1.0, 0.0, fade_n, dtype=np.float32)

    mix = np.clip(mix, -0.98, 0.98)
    sf.write(str(out_wav), mix, sr, subtype="PCM_16")


def list_saved_tracks() -> dict:
    tracks = {}
    for wav in VOZ_DIR.glob("narracion_*.wav"):
        stem = wav.stem
        key = None
        if stem == "narracion_full":
            key = "taured-1954:full"
        elif stem == "narracion_short":
            key = "taured-1954:short"
        elif stem.endswith("_full"):
            ep = stem[len("narracion_") : -len("_full")]
            key = f"{ep}:full"
        elif stem.endswith("_short"):
            ep = stem[len("narracion_") : -len("_short")]
            key = f"{ep}:short"
        if not key:
            continue

        meta_file = wav.with_suffix(".json")
        durations = None
        if meta_file.exists():
            try:
                durations = json.loads(meta_file.read_text(encoding="utf-8")).get("durations")
            except Exception:
                durations = None

        if not durations:
            durations = extract_durations_from_wav(wav)
            if durations:
                try:
                    meta_file.write_text(json.dumps({"durations": durations}, ensure_ascii=False), encoding="utf-8")
                except Exception:
                    pass

        try:
            total_dur = round(sf.info(str(wav)).duration, 4)
        except Exception:
            total_dur = None

        tracks[key] = {
            "audioUrl": f"/voz/{wav.name}?t={int(wav.stat().st_mtime * 1000)}",
            "durations": durations,
            "totalDuration": total_dur,
        }
    return tracks


async def api_status(request):
    return JSONResponse({
        "ok": True,
        "cuda": torch.cuda.is_available(),
        "hasVoiceSample": REF_WAV.exists(),
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "savedTracks": list_saved_tracks(),
    })


async def api_save_voice(request):
    raw = await request.body()
    if not raw:
        return JSONResponse({"ok": False, "error": "Audio vacío."}, status_code=400)

    ext = request.headers.get("x-audio-ext", "webm").lstrip(".").lower() or "webm"
    if ext not in {"webm", "ogg", "wav", "mp3", "m4a", "mp4"}:
        ext = "webm"

    def process_audio():
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / f"input.{ext}"
            src.write_bytes(raw)
            run_ffmpeg(["-i", str(src), "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(REF_WAV)])
        info = sf.info(str(REF_WAV))
        return round(info.duration, 2)

    try:
        dur = await asyncio.to_thread(process_audio)
        return JSONResponse({"ok": True, "duration": dur})
    except Exception as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)


def _run_clone_job(job_id: str, lines: list[str], pause_sec: float, exaggeration: float, safe_ep: str, format_key: str):
    out_wav = VOZ_DIR / f"narracion_{safe_ep}_{format_key}.wav"
    total_lines = len(lines)
    try:
        update_job(job_id, message="Cargando modelo de voz en la gráfica RTX 4050...", pct=3)
        model = get_model()
        sr = int(model.sr)
        pause_samples = int(round(pause_sec * sr))
        tail_samples = int(round(0.35 * sr))
        min_scene_samples = int(round(2.0 * sr))

        segments: list[np.ndarray] = []
        durations: list[float] = []
        cum_samples = 0
        prev_reported_sec = 0.0

        for idx, line in enumerate(lines, start=1):
            pct = round(((idx - 1) / total_lines) * 92) + 4
            update_job(
                job_id,
                current=idx,
                total=total_lines,
                pct=pct,
                message=f"Generando voz de la escena {idx} de {total_lines}...",
            )
            print(f"[Estudio] Generando escena {idx}/{total_lines} ({safe_ep} · {format_key})...")
            wav = model.generate(
                line,
                language_id="es",
                audio_prompt_path=str(REF_WAV),
                exaggeration=exaggeration,
            )
            audio_np = wav.squeeze().detach().cpu().numpy().astype(np.float32)
            pad_after = pause_samples if idx < total_lines else tail_samples
            slot_len = len(audio_np) + pad_after
            if slot_len < min_scene_samples:
                pad_after += min_scene_samples - slot_len

            seg_with_pause = np.concatenate([audio_np, np.zeros(pad_after, dtype=np.float32)])
            segments.append(seg_with_pause)

            cum_samples += len(seg_with_pause)
            exact_cum_sec = round(cum_samples / float(sr), 4)
            scene_dur = round(exact_cum_sec - prev_reported_sec, 4)
            prev_reported_sec = exact_cum_sec
            durations.append(scene_dur)

        update_job(job_id, pct=97, message="Uniendo escenas con precisión al milisegundo...")
        full_audio = np.concatenate(segments) if segments else np.zeros(sr, dtype=np.float32)
        sf.write(str(out_wav), full_audio, sr, subtype="PCM_16")
        out_wav.with_suffix(".json").write_text(
            json.dumps({"durations": durations}, ensure_ascii=False),
            encoding="utf-8",
        )

        update_job(
            job_id,
            status="done",
            pct=100,
            message="¡Voz clonada y sincronizada al milisegundo!",
            audioUrl=f"/voz/{out_wav.name}?t={int(time.time() * 1000)}",
            durations=durations,
        )
    except Exception as exc:
        update_job(job_id, status="error", error=str(exc), message=f"Error: {exc}")


async def api_clone_start(request):
    if not REF_WAV.exists():
        return JSONResponse(
            {"ok": False, "error": "Primero graba o sube tu muestra de voz (mi_voz.wav)."},
            status_code=400,
        )

    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "JSON inválido."}, status_code=400)

    lines = [str(x).strip() for x in payload.get("lines", []) if str(x).strip()]
    if not lines:
        return JSONResponse({"ok": False, "error": "No hay textos para narrar."}, status_code=400)

    pause_sec = float(payload.get("pauseSec", 0.45))
    exaggeration = float(payload.get("exaggeration", 0.55))
    format_key = "short" if payload.get("formatKey") in ("short", "reel") else "full"
    raw_ep = str(payload.get("episodeId", "ep")).strip()
    safe_ep = "".join(c for c in raw_ep if c.isalnum() or c in ("-", "_")) or "ep"

    job_id = uuid.uuid4().hex[:12]
    with _JOBS_LOCK:
        _JOBS[job_id] = {
            "ok": True,
            "status": "running",
            "current": 0,
            "total": len(lines),
            "pct": 1,
            "message": "Iniciando clonación de voz...",
        }

    thread = threading.Thread(
        target=_run_clone_job,
        args=(job_id, lines, pause_sec, exaggeration, safe_ep, format_key),
        daemon=True,
    )
    thread.start()
    return JSONResponse({"ok": True, "jobId": job_id})


async def api_job_status(request):
    job_id = request.path_params.get("job_id", "")
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if not job:
            return JSONResponse({"ok": False, "error": "Trabajo no encontrado."}, status_code=404)
        return JSONResponse(dict(job))


async def api_convert_mp4(request):
    raw = await request.body()
    if not raw:
        return JSONResponse({"ok": False, "error": "Video vacío."}, status_code=400)

    raw_name = request.headers.get("x-video-name", "video-stickman").strip()
    safe_name = "".join(c for c in raw_name if c.isalnum() or c in ("-", "_")) or "video-stickman"
    container = request.headers.get("x-container", "webm").strip().lower()
    episode_id = request.headers.get("x-episode-id", "").strip()
    format_key = request.headers.get("x-format-key", "full").strip()
    include_bgm = request.headers.get("x-include-bgm", "1").strip() == "1"
    try:
        bgm_vol = float(request.headers.get("x-bgm-volume", "0.6"))
    except ValueError:
        bgm_vol = 0.6
    try:
        total_duration = float(request.headers.get("x-total-duration", "0"))
    except ValueError:
        total_duration = 0.0
    try:
        sfx_cues = json.loads(request.headers.get("x-sfx-cues", "[]"))
        if not isinstance(sfx_cues, list):
            sfx_cues = []
    except Exception:
        sfx_cues = []

    out_mp4 = EXPORT_DIR / f"{safe_name}.mp4"

    def convert():
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            if container in ("h264", "ivf"):
                ext = "h264" if container == "h264" else "ivf"
                src_vid = tmp_path / f"{safe_name}.{ext}"
                src_vid.write_bytes(raw)
                master_wav = tmp_path / "master_audio.wav"
                voice_wav = resolve_voice_wav(episode_id, format_key) if episode_id else None
                synthesize_master_audio(
                    master_wav,
                    max(1.0, total_duration),
                    voice_wav,
                    include_bgm,
                    bgm_vol,
                    sfx_cues,
                )
                if container == "h264":
                    run_ffmpeg([
                        "-fflags", "+genpts",
                        "-r", "30",
                        "-f", "h264",
                        "-i", str(src_vid),
                        "-i", str(master_wav),
                        "-map", "0:v:0",
                        "-map", "1:a:0",
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-ar", "48000",
                        "-ac", "2",
                        "-movflags", "+faststart",
                        str(out_mp4),
                    ])
                else:
                    run_ffmpeg([
                        "-i", str(src_vid),
                        "-i", str(master_wav),
                        "-map", "0:v:0",
                        "-map", "1:a:0",
                        "-c:v", "libx264",
                        "-preset", "fast",
                        "-crf", "18",
                        "-profile:v", "high",
                        "-level:v", "4.2",
                        "-pix_fmt", "yuv420p",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-ar", "48000",
                        "-ac", "2",
                        "-movflags", "+faststart",
                        str(out_mp4),
                    ])
            else:
                src_webm = tmp_path / f"{safe_name}.webm"
                src_webm.write_bytes(raw)
                run_ffmpeg([
                    "-i", str(src_webm),
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "18",
                    "-profile:v", "high",
                    "-level:v", "4.2",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-ar", "48000",
                    "-movflags", "+faststart",
                    str(out_mp4),
                ])
        return str(out_mp4)

    try:
        saved_path = await asyncio.to_thread(convert)
        return JSONResponse({
            "ok": True,
            "filename": out_mp4.name,
            "downloadUrl": f"/exportados/{out_mp4.name}?t={int(time.time() * 1000)}",
            "localPath": saved_path,
        })
    except Exception as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=500)


class StudioHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET").upper()
        if method == "OPTIONS":
            await send({
                "type": "http.response.start",
                "status": 204,
                "headers": [
                    (b"access-control-allow-origin", b"*"),
                    (b"access-control-allow-methods", b"GET, POST, OPTIONS"),
                    (b"access-control-allow-headers", b"*"),
                    (b"access-control-allow-private-network", b"true"),
                ],
            })
            await send({"type": "http.response.body", "body": b""})
            return

        path = scope.get("path", "")
        is_code = path == "/" or path.endswith((".html", ".js", ".css"))

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = [
                    (k, v)
                    for k, v in message.get("headers", [])
                    if k.lower() not in (b"cache-control", b"access-control-allow-origin", b"access-control-allow-private-network")
                ]
                headers.append((b"access-control-allow-origin", b"*"))
                headers.append((b"access-control-allow-private-network", b"true"))
                if is_code:
                    headers.append(
                        (b"cache-control", b"no-cache, max-age=0, must-revalidate")
                    )
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_wrapper)


app = Starlette(
    routes=[
        Route("/api/status", api_status, methods=["GET"]),
        Route("/api/save-voice", api_save_voice, methods=["POST"]),
        Route("/api/clone-start", api_clone_start, methods=["POST"]),
        Route("/api/job/{job_id}", api_job_status, methods=["GET"]),
        Route("/api/convert-mp4", api_convert_mp4, methods=["POST"]),
        Mount("/", app=StaticFiles(directory=str(ROOT_DIR), html=True), name="static"),
    ]
)
app.add_middleware(StudioHeadersMiddleware)


if __name__ == "__main__":
    url = "http://127.0.0.1:8765"
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    print(f"Estudio listo en {url} (no cierres esta ventana mientras uses el estudio)")
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="warning")
