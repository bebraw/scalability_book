"""Drive synthetic Companion setup through a real terminal, without dependencies."""

import errno
import json
import os
import pty
import select
import signal
import sys
import time

scenario = json.load(sys.stdin)
pid, terminal = pty.fork()
if pid == 0:
    os.execve(scenario["command"][0], scenario["command"], scenario["environment"])

transcript = b""
step = 0
search_from = 0
status = None
deadline = time.monotonic() + 15
try:
    while time.monotonic() < deadline:
        readable, _, _ = select.select([terminal], [], [], 0.1)
        if readable:
            try:
                chunk = os.read(terminal, 65536)
            except OSError as error:
                if error.errno != errno.EIO:
                    raise
                chunk = b""
            if chunk:
                transcript += chunk
                if step < len(scenario["steps"]):
                    expected = scenario["steps"][step]
                    prompt = expected["prompt"].encode()
                    position = transcript.find(prompt, search_from)
                    if position >= 0:
                        os.write(terminal, expected["input"].encode())
                        search_from = position + len(prompt)
                        step += 1
            else:
                _, status = os.waitpid(pid, 0)
                break
        ended, result = os.waitpid(pid, os.WNOHANG)
        if ended:
            status = result
            # Drain the terminal after the process exits.
            while select.select([terminal], [], [], 0)[0]:
                try:
                    chunk = os.read(terminal, 65536)
                    if not chunk:
                        break
                    transcript += chunk
                except OSError as error:
                    if error.errno != errno.EIO:
                        raise
                    break
            break
finally:
    if status is None:
        os.kill(pid, signal.SIGKILL)
        _, status = os.waitpid(pid, 0)
    os.close(terminal)

print(json.dumps({
    "code": os.waitstatus_to_exitcode(status),
    "steps": step,
    "transcript": transcript.decode(errors="replace"),
}))
