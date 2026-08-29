# -*- coding: utf-8 -*-
# longlife-mud daily build regression (J35 M2, KJ_Longlife_BuildCheck 09:15)
import subprocess, sys, os, time
CREATE_NO_WINDOW = 0x08000000
here = os.path.dirname(os.path.abspath(__file__))
# R2（J27 A1 根因修复，2026-08-29 Q）：子进程 stdio 强制 utf-8，使 build.py 的中文输出与本脚本的
# utf-8 解码一致——不匹配时原实现按 cp936 字节 / utf-8 解码产出 U+FFFD，再由 print 写 GBK stdout 抛
# UnicodeEncodeError 自杀，真实 rc 被吞。现改为自带 env，不依赖调度器是否注入（WB 侧 R1 仍保留）。
env = dict(os.environ, PYTHONIOENCODING="utf-8")
r = subprocess.run([sys.executable, os.path.join(here, "build.py"), "--check"],
                   capture_output=True, text=True, cwd=here, encoding="utf-8", errors="strict", env=env, creationflags=CREATE_NO_WINDOW)
line = "%s rc=%d %s\n" % (time.strftime("%Y-%m-%d %H:%M"), r.returncode,
                           (r.stdout or r.stderr).strip().splitlines()[-1][:120] if (r.stdout or r.stderr) else "")
open(os.path.join(here, "build_check.log"), "a", encoding="utf-8").write(line)
try:
    print(line.strip())
except UnicodeEncodeError:
    sys.stdout.buffer.write(line.strip().encode("utf-8", "replace") + b"\n")
sys.exit(r.returncode)
