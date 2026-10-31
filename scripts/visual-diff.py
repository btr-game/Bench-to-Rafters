# The visual check's second half (round 27): which screens changed between two runs of
# scripts/visual.cjs, and contact sheets to look through many screens at once.
#   python3 scripts/visual-diff.py <old dir> <new dir>     screens that changed, most first
#   python3 scripts/visual-diff.py --sheet <dir> [ids...]  <dir>/sheet-<config>-<n>.png, 12 to a sheet
import sys, os, glob
from PIL import Image, ImageChops, ImageDraw


def changed(a_path, b_path):
    a = Image.open(a_path).convert('RGB')
    b = Image.open(b_path).convert('RGB')
    if a.size != b.size:
        return 1.0, f'size {a.size[0]}x{a.size[1]} -> {b.size[0]}x{b.size[1]}'
    diff = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 24 else 0)
    n = diff.histogram()[255]
    return n / (a.size[0] * a.size[1]), ''


def compare(old, new):
    rows = []
    for cfg in sorted(os.listdir(new)):
        if not os.path.isdir(os.path.join(new, cfg)):
            continue
        for p in sorted(glob.glob(os.path.join(new, cfg, '*.png'))):
            q = os.path.join(old, cfg, os.path.basename(p))
            if not os.path.exists(q):
                rows.append((1.0, cfg, os.path.basename(p), 'new screen'))
                continue
            frac, note = changed(q, p)
            if frac > 0.002:
                rows.append((frac, cfg, os.path.basename(p), note))
    rows.sort(reverse=True)
    for frac, cfg, name, note in rows:
        print(f'{100 * frac:7.3f}%  {cfg:14} {name}  {note}')
    print(f'{len(rows)} screens changed')


def sheets(d, ids):
    for cfg in sorted(os.listdir(d)):
        files = sorted(glob.glob(os.path.join(d, cfg, '*.png')))
        if ids:
            files = [f for f in files if os.path.basename(f)[:-4] in ids]
        if not files:
            continue
        phone = cfg.startswith('phone')
        tw = 260 if phone else 480
        th = 760 if phone else 520
        cols = 6 if phone else 4
        for k in range(0, len(files), 12):
            group = files[k:k + 12]
            rows = (len(group) + cols - 1) // cols
            sheet = Image.new('RGB', (cols * tw, rows * (th + 20)), 'white')
            draw = ImageDraw.Draw(sheet)
            for i, f in enumerate(group):
                im = Image.open(f).convert('RGB')
                # the top of the page, scaled to the tile's width
                scale = tw / im.size[0]
                im = im.resize((tw, max(1, int(im.size[1] * scale))))
                im = im.crop((0, 0, tw, min(th, im.size[1])))
                x, y = (i % cols) * tw, (i // cols) * (th + 20)
                sheet.paste(im, (x, y + 20))
                draw.text((x + 4, y + 4), os.path.basename(f)[:-4], fill='black')
            sheet.save(os.path.join(d, f'sheet-{cfg}-{k // 12 + 1}.png'))


if __name__ == '__main__':
    if sys.argv[1] == '--sheet':
        sheets(sys.argv[2], set(sys.argv[3:]))
    else:
        compare(sys.argv[1], sys.argv[2])
