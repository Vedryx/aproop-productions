#!/usr/bin/env bash
# Encodes the heavy design assets into web-ready files in public/uploads/.
#
# The design MCP caps get_file at 256 KiB, so these five never came through the
# import and have to be supplied as originals. The masters are also far too big
# to ship as-is (the hero video is a 159 MB / 18.7 Mbps 1080p master, the
# posters are 6000x3375 PNGs), so this encodes rather than copies.
#
#   npm run assets                    # searches ~/Downloads and ~/Desktop
#   npm run assets -- ~/some/folder   # search somewhere specific
#
# Re-run it any time you get fresh masters; it overwrites the outputs.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/uploads"
mkdir -p "$DEST"

if [ "$#" -gt 0 ]; then
  ROOTS=("$@")
else
  ROOTS=("$HOME/Downloads" "$HOME/Desktop")
fi

have_ffmpeg=1
command -v ffmpeg >/dev/null 2>&1 || have_ffmpeg=0
[ "$have_ffmpeg" -eq 1 ] || echo "note: ffmpeg not found — falling back to plain copies (files will be large)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Make archive contents searchable too.
for root in "${ROOTS[@]}"; do
  [ -d "$root" ] || continue
  while IFS= read -r zip; do
    [ -n "$zip" ] || continue
    unzip -qo "$zip" -d "$TMP/$(basename "${zip%.zip}")" 2>/dev/null
  done < <(find "$root" -maxdepth 2 -iname '*.zip' 2>/dev/null)
done

# find_source <glob> [glob...] -> prints first match
find_source() {
  for pattern in "$@"; do
    for root in "${ROOTS[@]}" "$TMP"; do
      [ -d "$root" ] || continue
      hit="$(find "$root" -type f -iname "$pattern" 2>/dev/null | head -1)"
      if [ -n "$hit" ]; then
        printf '%s' "$hit"
        return 0
      fi
    done
  done
  return 1
}

echo "Looking in: ${ROOTS[*]}"
echo

done_count=0
missing_count=0

report() { # <label> <outfile>
  if [ -f "$DEST/$2" ]; then
    size=$(du -h "$DEST/$2" | cut -f1 | tr -d ' ')
    echo "  ok      $2  ($size)  <- $1"
    done_count=$((done_count + 1))
  else
    echo "  FAILED  $2"
    missing_count=$((missing_count + 1))
  fi
}

skip() {
  echo "  missing $1  (looked for: $2)"
  missing_count=$((missing_count + 1))
}

# ---- hero video ------------------------------------------------------------
if src="$(find_source 'biryani_web_compressed.mp4' '*biryani*.mp4' '*BIRYANI*.mp4')"; then
  if [ "$have_ffmpeg" -eq 1 ]; then
    ffmpeg -y -v error -i "$src" \
      -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 30 -preset slow \
      -vf "scale=1920:-2" -c:a aac -b:a 96k -movflags +faststart \
      "$DEST/biryani_web_compressed.mp4"
    ffmpeg -y -v error -ss 2 -i "$src" -frames:v 1 -vf "scale=1600:-2" -q:v 5 \
      "$DEST/hero-poster.jpg"
  else
    cp "$src" "$DEST/biryani_web_compressed.mp4"
  fi
  report "$(basename "$src")" "biryani_web_compressed.mp4"
else
  skip "biryani_web_compressed.mp4" "*biryani*.mp4"
fi

# ---- makers duo photo (keeps alpha) ---------------------------------------
if src="$(find_source 'makers-bg.png' 'duo_photo.png' '*duo*photo*.png')"; then
  if [ "$have_ffmpeg" -eq 1 ]; then
    ffmpeg -y -v error -i "$src" -vf "scale=1778:-2" "$DEST/makers-bg.png"
  else
    cp "$src" "$DEST/makers-bg.png"
  fi
  report "$(basename "$src")" "makers-bg.png"
else
  skip "makers-bg.png" "duo_photo.png"
fi

# ---- About cutout (keeps alpha) -------------------------------------------
if src="$(find_source 'founders-cutout.png' 'about_us.png' '*founders*.png')"; then
  if [ "$have_ffmpeg" -eq 1 ]; then
    ffmpeg -y -v error -i "$src" -vf "scale=920:-2" "$DEST/founders-cutout.png"
  else
    cp "$src" "$DEST/founders-cutout.png"
  fi
  report "$(basename "$src")" "founders-cutout.png"
else
  skip "founders-cutout.png" "*founders*.png"
fi

# ---- Be the Producer artwork (no alpha -> jpg) ----------------------------
if src="$(find_source 'Datan Short Film.png' '*datan*.png' '*datan*.jpg')"; then
  if [ "$have_ffmpeg" -eq 1 ]; then
    ffmpeg -y -v error -i "$src" -vf "scale=1600:-2" -q:v 4 "$DEST/datan-poster.jpg"
  else
    cp "$src" "$DEST/datan-poster.jpg"
  fi
  report "$(basename "$src")" "datan-poster.jpg"
else
  skip "datan-poster.jpg" "Datan Short Film.png"
fi

if src="$(find_source 'Bhimbhaskara Song.png' '*bhimbhaskar*.png' '*bhimbhaskar*.jpg')"; then
  if [ "$have_ffmpeg" -eq 1 ]; then
    ffmpeg -y -v error -i "$src" -vf "scale=1600:-2" -q:v 4 "$DEST/bhimbhaskara-keyart.jpg"
  else
    cp "$src" "$DEST/bhimbhaskara-keyart.jpg"
  fi
  report "$(basename "$src")" "bhimbhaskara-keyart.jpg"
else
  skip "bhimbhaskara-keyart.jpg" "Bhimbhaskara Song.png"
fi

echo
echo "$done_count encoded, $missing_count missing -> $DEST"
