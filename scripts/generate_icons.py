import zlib
import struct
import math

def create_png(width, height, is_maskable=False):
    # Prepare RGBA raw data
    raw_data = bytearray()
    
    # Colors
    bg_r, bg_g, bg_b = 9, 13, 22          # #090d16
    emerald_r, emerald_g, emerald_b = 16, 185, 129 # #10b981
    teal_r, teal_g, teal_b = 20, 184, 166      # #14b8a6
    dark_r, dark_g, dark_b = 2, 6, 23         # #020617
    white_r, white_g, white_b = 255, 255, 255

    cx, cy = width / 2.0, height / 2.0
    scale = (width / 512.0) * (0.8 if is_maskable else 1.0)

    for y in range(height):
        raw_data.append(0)  # Filter byte for Scanline
        for x in range(width):
            # Coordinates relative to center
            dx = (x - cx) / scale
            dy = (y - cy) / scale
            
            # Default background
            r, g, b, a = bg_r, bg_g, bg_b, 255
            
            # Main Wallet Body: rect from dx: -160..160, dy: -80..120 with radius 36
            # Dist to rounded rect
            rx, ry = 160, 100
            bx = abs(dx) - rx + 36
            by = abs(dy - 20) - ry + 36
            dist_box = math.sqrt(max(0, bx)**2 + max(0, by)**2) - 36
            
            # Flap at top: dy -100..-40, dx -140..140
            fx = abs(dx) - 130 + 20
            fy = abs(dy + 60) - 30 + 20
            dist_flap = math.sqrt(max(0, fx)**2 + max(0, fy)**2) - 20

            # Clasp / lock circle at (70, 20)
            dist_lock = math.hypot(dx - 70, dy - 20)
            
            if dist_box <= 0:
                # Gradient emerald
                t = (dy + 100) / 200.0
                t = max(0.0, min(1.0, t))
                r = int(emerald_r * (1 - t) + teal_r * t)
                g = int(emerald_g * (1 - t) + teal_g * t)
                b = int(emerald_b * (1 - t) + teal_b * t)
            elif dist_flap <= 0:
                r, g, b = 52, 211, 153 # #34d399
            
            # Draw Lock Plate
            if abs(dx - 70) <= 40 and abs(dy - 20) <= 24:
                r, g, b = dark_r, dark_g, dark_b
            if dist_lock <= 10:
                r, g, b = emerald_r, emerald_g, emerald_b
            
            raw_data.extend([r, g, b, a])

    def png_chunk(chunk_type, data):
        c = chunk_type + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)

    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat_data = zlib.compress(bytes(raw_data), 9)

    png = b'\x89PNG\r\n\x1a\n'
    png += png_chunk(b'IHDR', ihdr_data)
    png += png_chunk(b'IDAT', idat_data)
    png += png_chunk(b'IEND', b'')
    return png

# Generate icons
for size, name in [(192, 'pwa-192x192.png'), (512, 'pwa-512x512.png'), (180, 'apple-touch-icon.png')]:
    with open(f'public/{name}', 'wb') as f:
        f.write(create_png(size, size, False))

with open('public/pwa-maskable-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, True))

# Favicon copy
with open('public/favicon.ico', 'wb') as f:
    f.write(create_png(64, 64, False))

print("Icons generated successfully!")
