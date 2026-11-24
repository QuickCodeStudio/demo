#!/usr/bin/env python3
"""Build favicon sets from qc_icon_large.png for Web, Studio, and generated portals."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

from PIL import Image

PNG_SIZES = {
    "favicon-32.png": 32,
    "favicon-48.png": 48,
    "favicon-96.png": 96,
    "favicon-192.png": 192,
    "favicon-512.png": 512,
    "apple-touch-icon.png": 180,
    "mstile-150x150.png": 150,
}
ICO_SIZES = (16, 32, 48)
QC_ICON_SIZE = 128
STUDIO_MANIFEST = """{
  "name": "QuickCode Studio",
  "short_name": "Studio",
  "description": "QuickCode diagram-driven microservices studio",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#3b488e",
  "theme_color": "#3b488e",
  "icons": [
    {
      "src": "/img/favicons/favicon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/img/favicons/favicon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
"""


def find_workspace(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "QuickCode.Web").is_dir() and (candidate / "QuickCode.Studio").is_dir():
            return candidate
        presentation = candidate / "src" / "Presentation"
        if presentation.is_dir() and any(presentation.glob("*Portal")):
            return candidate
    return start


def default_source(root: Path) -> Path:
    candidates = [
        root / "QuickCode.Web" / "wwwroot" / "img" / "qc_icon_large.png",
        root / "wwwroot" / "img" / "qc_icon_large.png",
    ]
    candidates.extend(sorted(root.glob("src/Presentation/*Portal/wwwroot/img/qc_icon_large.png")))
    candidates.extend(sorted(root.glob("**/wwwroot/img/qc_icon_large.png")))
    for path in candidates:
        if path.is_file():
            return path
    raise FileNotFoundError(
        "qc_icon_large.png not found. Pass --src or place it at "
        "QuickCode.Web/wwwroot/img/qc_icon_large.png or Portal/wwwroot/img/qc_icon_large.png."
    )


def sanitize_transparent_rgb(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return image


def have_magick() -> bool:
    return shutil.which("magick") is not None


def render_png(master_path: Path, master_image: Image.Image, size: int, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if have_magick():
        subprocess.run(
            [
                "magick",
                str(master_path),
                "-background",
                "none",
                "-alpha",
                "on",
                "-filter",
                "Lanczos",
                "-resize",
                f"{size}x{size}",
                f"PNG32:{dest}",
            ],
            check=True,
        )
        return
    master_image.resize((size, size), Image.Resampling.LANCZOS).save(dest, format="PNG")


def write_ico(master_path: Path, master_image: Image.Image, frames: dict[int, Path], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if have_magick():
        subprocess.run(["magick", *[str(frames[size]) for size in ICO_SIZES], str(dest)], check=True)
        return
    resized = [master_image.resize((size, size), Image.Resampling.LANCZOS) for size in ICO_SIZES]
    resized[0].save(
        dest,
        format="ICO",
        sizes=[(size, size) for size in ICO_SIZES],
        append_images=resized[1:],
    )


class FaviconSet:
    def __init__(self, tmp: Path, master_path: Path, master_image: Image.Image):
        self.tmp = tmp
        self.master_path = master_path
        self.master_image = master_image
        self.files: dict[str, Path] = {}

    def render(self, size: int, name: str) -> Path:
        out = self.tmp / name
        render_png(self.master_path, self.master_image, size, out)
        return out

    def build(self) -> None:
        for name, size in PNG_SIZES.items():
            self.files[name] = self.render(size, name)
        self.files["qc_icon.png"] = self.render(QC_ICON_SIZE, "qc_icon.png")
        frames = {size: self.render(size, f"ico-{size}.png") for size in ICO_SIZES}
        ico = self.tmp / "favicon.ico"
        write_ico(self.master_path, self.master_image, frames, ico)
        self.files["favicon.ico"] = ico

    def copy_png_set(self, dest_dir: Path) -> None:
        dest_dir.mkdir(parents=True, exist_ok=True)
        for name in PNG_SIZES:
            shutil.copy2(self.files[name], dest_dir / name)

    def write_web(self, wwwroot: Path, source: Path) -> None:
        fav = wwwroot / "img" / "favicons"
        icons = wwwroot / "img" / "icons"
        icons.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self.files["favicon.ico"], wwwroot / "favicon.ico")
        self.copy_png_set(fav)
        shutil.copy2(self.files["qc_icon.png"], icons / "qc_icon.png")
        jpg = self.master_image.convert("RGBA")
        background = Image.new("RGBA", jpg.size, (255, 255, 255, 255))
        Image.alpha_composite(background, jpg).convert("RGB").save(
            wwwroot / "img" / "qc_icon.jpg",
            quality=92,
        )
        _copy_source_if_needed(source, wwwroot / "img" / "qc_icon_large.png")
        print(f"  web     {wwwroot}")

    def write_studio(self, public: Path) -> None:
        fav = public / "img" / "favicons"
        icons = public / "img" / "icons"
        icons.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self.files["favicon.ico"], public / "favicon.ico")
        self.copy_png_set(fav)
        shutil.copy2(self.files["qc_icon.png"], public / "qc_icon.png")
        shutil.copy2(self.files["qc_icon.png"], icons / "qc_icon.png")
        shutil.copy2(self.files["apple-touch-icon.png"], public / "apple-touch-icon.png")
        (public / "site.webmanifest").write_text(STUDIO_MANIFEST, encoding="utf-8")
        print(f"  studio  {public}")

    def write_portal(self, wwwroot: Path, source: Path) -> None:
        fav = wwwroot / "img" / "favicons"
        icons = wwwroot / "img" / "icons"
        images = wwwroot / "images"
        icons.mkdir(parents=True, exist_ok=True)
        images.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self.files["favicon.ico"], wwwroot / "favicon.ico")
        self.copy_png_set(fav)
        shutil.copy2(self.files["qc_icon.png"], icons / "qc_icon.png")
        shutil.copy2(self.files["qc_icon.png"], images / "qc_icon.png")
        _copy_source_if_needed(source, wwwroot / "img" / "qc_icon_large.png")
        print(f"  portal  {wwwroot}")
        presentation = wwwroot.parent.parent
        for dashboard in sorted(presentation.glob("*Gateway/Dashboard")):
            self.write_png(dashboard / "qc_icon.png")

    def write_png(self, dest: Path) -> None:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self.files["qc_icon.png"], dest)
        print(f"  png     {dest}")


def _copy_source_if_needed(source: Path, dest: Path) -> None:
    if dest.resolve() == source.resolve():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)


def bump_studio_cache(index_html: Path) -> None:
    if not index_html.is_file():
        return
    stamp = datetime.now().strftime("%Y%m%d%H%M")
    text = index_html.read_text(encoding="utf-8")
    updated, count = re.subn(r"\?v=\d+", f"?v={stamp}", text)
    if count:
        index_html.write_text(updated, encoding="utf-8")
        print(f"  cache   {index_html} -> ?v={stamp}")


def is_generator_repo(root: Path) -> bool:
    return (root / "QuickCode.Web").is_dir() and (root / "QuickCode.Studio").is_dir()


def discover_portals(root: Path) -> list[Path]:
    return sorted(path for path in root.glob("src/Presentation/*Portal/wwwroot") if path.is_dir())


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate favicon.ico + PNG set from qc_icon_large.png."
    )
    parser.add_argument("--src", type=Path, help="Source PNG (default: qc_icon_large.png)")
    parser.add_argument(
        "--wwwroot",
        action="append",
        default=[],
        type=Path,
        help="Extra portal wwwroot to write. Repeatable.",
    )
    parser.add_argument(
        "--only-wwwroots",
        action="store_true",
        help="Skip Web/Studio/Template defaults; write only --wwwroot targets.",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    script_dir = Path(__file__).resolve().parent
    root = find_workspace(script_dir)
    source = (args.src or default_source(root)).resolve()
    if not source.is_file():
        raise SystemExit(f"Source not found: {source}")

    source_bytes = source.read_bytes()
    with tempfile.TemporaryDirectory(prefix="qc-favicons-") as tmp_name:
        tmp = Path(tmp_name)
        master_image = sanitize_transparent_rgb(Image.open(source))
        master_path = tmp / "master.png"
        master_image.save(master_path)
        assets = FaviconSet(tmp, master_path, master_image)
        assets.build()

        print(f"source  {source} ({master_image.size[0]}x{master_image.size[1]})")
        print(f"engine  {'magick' if have_magick() else 'pillow'}")

        wrote = False
        if not args.only_wwwroots:
            if is_generator_repo(root):
                assets.write_web(root / "QuickCode.Web" / "wwwroot", source)
                assets.write_studio(root / "QuickCode.Studio" / "app" / "public")
                bump_studio_cache(root / "QuickCode.Studio" / "app" / "index.html")
                template_portal = (
                    root
                    / "QuickCode.Generator"
                    / "Templates"
                    / "scaffolds"
                    / "net10"
                    / "TemplateBase"
                    / "src"
                    / "Presentation"
                    / "QuickCode.Template0.Portal"
                    / "wwwroot"
                )
                if template_portal.is_dir():
                    assets.write_portal(template_portal, source)
                wrote = True
            else:
                portals = discover_portals(root)
                if not portals:
                    raise SystemExit(f"No Portal wwwroot found under {root}")
                for portal in portals:
                    assets.write_portal(portal, source)
                wrote = True

        for wwwroot in args.wwwroot:
            assets.write_portal(wwwroot.resolve(), source)
            wrote = True

        if not wrote:
            raise SystemExit("Nothing to write. Pass --wwwroot or run from the QuickCode repo.")

        if source.read_bytes() != source_bytes:
            raise SystemExit("Source qc_icon_large.png was mutated; aborting.")

    print("OK source unchanged")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
