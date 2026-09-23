"""Losslessly refilter PNG scanlines; preserve every pixel and ancillary chunk.
Run: python3 scripts/optimize-png.py public/uploads/*.png
Only non-interlaced 8-bit PNGs are supported. Smaller output replaces the input.
"""
import pathlib
import struct
import sys
import zlib


def paeth(a, b, c):
    p = a + b - c
    distances = (abs(p - a), abs(p - b), abs(p - c))
    return (a, b, c)[distances.index(min(distances))]


def predictors(row, previous, bpp):
    left = bytes(bpp) + row[:-bpp]
    corner = bytes(bpp) + previous[:-bpp]
    return (
        bytes(len(row)), left, previous,
        bytes((a + b) // 2 for a, b in zip(left, previous)),
        bytes(paeth(a, b, c) for a, b, c in zip(left, previous, corner)),
    )


def decode(raw, width, height, bpp):
    stride = width * bpp
    previous = bytearray(stride)
    rows = []
    assert len(raw) == (stride + 1) * height
    for y in range(height):
        start = y * (stride + 1)
        kind = raw[start]
        row = bytearray(raw[start + 1:start + 1 + stride])
        assert 0 <= kind <= 4
        for x in range(stride):
            a = row[x - bpp] if x >= bpp else 0
            b = previous[x]
            c = previous[x - bpp] if x >= bpp else 0
            prediction = (0, a, b, (a + b) // 2, paeth(a, b, c))[kind]
            row[x] = (row[x] + prediction) & 255
        rows.append(bytes(row))
        previous = row
    return rows


def optimize(path):
    original = path.read_bytes()
    assert original[:8] == b'\x89PNG\r\n\x1a\n'
    chunks = []
    pos = 8
    while pos < len(original):
        size = struct.unpack('>I', original[pos:pos + 4])[0]
        kind = original[pos + 4:pos + 8]
        data = original[pos + 8:pos + 8 + size]
        crc = struct.unpack('>I', original[pos + 8 + size:pos + 12 + size])[0]
        assert zlib.crc32(kind + data) == crc
        chunks.append((kind, data))
        pos += size + 12
    width, height, depth, color, compression, filtering, interlace = struct.unpack('>IIBBBBB', chunks[0][1])
    if depth != 8 or interlace or compression or filtering or color not in (0, 2, 3, 4, 6):
        print(path, 'skipped: unsupported PNG layout')
        return
    bpp = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color]
    raw = zlib.decompress(b''.join(data for kind, data in chunks if kind == b'IDAT'))
    rows = decode(raw, width, height, bpp)
    previous = bytes(width * bpp)
    filtered = bytearray()
    for row in rows:
        candidates = [bytes((a - b) & 255 for a, b in zip(row, p)) for p in predictors(row, previous, bpp)]
        kind = min(range(5), key=lambda k: sum(min(v, 256 - v) for v in candidates[k]))
        filtered.append(kind)
        filtered.extend(candidates[kind])
        previous = row
    assert decode(filtered, width, height, bpp) == rows
    compressed = min((zlib.compress(raw, 9), zlib.compress(filtered, 9)), key=len)
    output = bytearray(original[:8])
    written = False
    for kind, data in chunks:
        if kind == b'IDAT':
            if written:
                continue
            data = compressed
            written = True
        output.extend(struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data)))
    if len(output) < len(original):
        path.write_bytes(output)
    print(path, f'{len(original):,} -> {min(len(original), len(output)):,} bytes; identical pixels and metadata')


for filename in sys.argv[1:]:
    optimize(pathlib.Path(filename))
