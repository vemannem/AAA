"""Simulate running generated notebooks: python3 nbrun.py nbs.json outdir"""
import json, os, subprocess, sys, shutil
nbs = json.load(open(sys.argv[1])); out = sys.argv[2]
for k, nb in enumerate(nbs):
    d = os.path.join(out, f"nb{k}"); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    title = "".join(nb["cells"][0]["source"]).split("\n")[0]
    status = "ok"
    for c in nb["cells"]:
        if c["cell_type"] != "code": continue
        src = "".join(c["source"])
        first = src.split("\n", 1)[0]
        if first.startswith("%%writefile"):
            p = os.path.join(d, first.split()[1]); os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "w").write(src.split("\n", 1)[1])
        elif first.startswith("%run"):
            mod = first.split()[1][:-3].replace("/", ".")
            env = dict(os.environ); env.pop("ANTHROPIC_API_KEY", None)
            r = subprocess.run([sys.executable, "-m", mod], cwd=d, capture_output=True, text=True, timeout=240, env=env)
            if r.returncode != 0:
                last = (r.stderr.strip().splitlines() or ["?"])[-1]
                status = f"{mod} exit {r.returncode}: {last[:120]}"
                if "lab" not in mod: break
        else:
            for line in src.splitlines():
                if line.startswith("!mkdir"):
                    for f in line.split()[2:]: os.makedirs(os.path.join(d, f), exist_ok=True)
                if line.startswith("%pip"): pass
            if "google.colab" in src: pass
    print(f"{title[:70]:70s} -> {status}")
