r"""
Clonador de voz local y gratuito en español (Chatterbox Multilingual, licencia MIT).
Uso rápido:
  1. Coloca una grabación limpia de 6-15 segundos de tu voz en: voz/mi_voz.wav (o .mp3/.m4a)
  2. Ejecuta:
     .\.venv\Scripts\python.exe clonar_voz.py --voz mi_voz.wav --guion guion_taured_short.txt --salida narracion_short.wav
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import perth
import soundfile as sf
import torch
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

if perth.PerthImplicitWatermarker is None:
    perth.PerthImplicitWatermarker = perth.DummyWatermarker


def ensure_wav_reference(src_path: Path, tmp_dir: Path) -> Path:
    """Convierte la muestra de voz a WAV mono 24kHz si viene en mp3/m4a/ogg."""
    if src_path.suffix.lower() == ".wav":
        return src_path
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("No se encontró ffmpeg en PATH para convertir tu audio de referencia.")
    out_wav = tmp_dir / "referencia_limpia.wav"
    subprocess.run(
        [ffmpeg, "-y", "-i", str(src_path), "-ac", "1", "-ar", "24000", str(out_wav)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return out_wav


def concat_with_pauses(parts: list[Path], out_path: Path, pause_sec: float, tmp_dir: Path) -> None:
    """Une los fragmentos WAV con pausas dramáticas usando ffmpeg."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        if len(parts) == 1:
            shutil.copy2(parts[0], out_path)
            return
        raise RuntimeError("Se requiere ffmpeg para unir múltiples líneas de guion.")

    silence = tmp_dir / "silencio.wav"
    subprocess.run(
        [
            ffmpeg, "-y",
            "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
            "-t", str(pause_sec),
            str(silence),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    concat_list = tmp_dir / "lista.txt"
    lines = []
    for idx, p in enumerate(parts):
        lines.append(f"file '{p.as_posix()}'")
        if idx < len(parts) - 1 and pause_sec > 0:
            lines.append(f"file '{silence.as_posix()}'")
    concat_list.write_text("\n".join(lines), encoding="utf-8")

    subprocess.run(
        [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c:a", "pcm_s16le", str(out_path)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera narración en español clonando tu voz en local.")
    parser.add_argument("--voz", required=True, help="Ruta a tu grabación de referencia (6-15s, .wav/.mp3/.m4a)")
    parser.add_argument("--texto", help="Frase única para probar rápido")
    parser.add_argument("--guion", help="Archivo .txt con una línea por escena")
    parser.add_argument("--salida", default="narracion_salida.wav", help="Archivo WAV final")
    parser.add_argument("--pausa", type=float, default=0.45, help="Pausa en segundos entre escenas (default: 0.45)")
    parser.add_argument("--exageracion", type=float, default=0.55, help="Expresividad emocional (0.2 a 1.0)")
    args = parser.parse_args()

    if not args.texto and not args.guion:
        print("Error: debes indicar --texto '...' o --guion archivo.txt", file=sys.stderr)
        return 1

    ref_path = Path(args.voz)
    if not ref_path.exists():
        print(f"Error: no existe el archivo de referencia: {ref_path}", file=sys.stderr)
        return 1

    if args.texto:
        lines = [args.texto.strip()]
    else:
        raw_lines = Path(args.guion).read_text(encoding="utf-8").splitlines()
        lines = [ln.strip() for ln in raw_lines if ln.strip() and not ln.strip().startswith("#")]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Usando dispositivo: {device}")
    print("Cargando modelo Chatterbox Multilingual (la primera vez descarga los pesos desde HuggingFace)...")
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        clean_ref = ensure_wav_reference(ref_path, tmp_dir)
        part_paths = []
        total_sec = 0.0

        for i, line in enumerate(lines, start=1):
            print(f"[{i}/{len(lines)}] Generando: {line[:70]}...")
            wav = model.generate(
                line,
                language_id="es",
                audio_prompt_path=str(clean_ref),
                exaggeration=args.exageracion,
            )
            audio_np = wav.squeeze().detach().cpu().numpy()
            dur = len(audio_np) / float(model.sr)
            total_sec += dur
            part_file = tmp_dir / f"escena_{i:02d}.wav"
            sf.write(str(part_file), audio_np, model.sr, subtype="PCM_16")
            part_paths.append(part_file)
            print(f"   -> Duración escena {i}: {dur:.2f}s")

        out_path = Path(args.salida)
        concat_with_pauses(part_paths, out_path, args.pausa, tmp_dir)
        print(f"\nListo! Audio guardado en: {out_path.resolve()} (duración aprox sin pausas: {total_sec:.2f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
