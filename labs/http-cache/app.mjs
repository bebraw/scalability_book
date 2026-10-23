const status = document.querySelector("#status");
let count = 0;
async function refreshLog() {
  const record = await (
    await fetch("/control/log", { cache: "no-store" })
  ).json();
  document.querySelector("#origin-count").textContent = String(
    record.requests.length,
  );
  document.querySelector("#version").textContent = String(record.version);
  document.querySelector("#log").textContent = JSON.stringify(
    record.requests,
    null,
    2,
  );
}
document.querySelector("#request").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const policy = document.querySelector("#policy").value;
    const response = await fetch(`/api/summary?policy=${policy}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    document.querySelector("#body").textContent = JSON.stringify(body, null, 2);
    document.querySelector("#fetches").textContent = String(++count);
    status.textContent = `Browser fetch ${count}: status ${response.status}. Compare the body with the origin log.`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    await refreshLog();
    button.disabled = false;
  }
});
document.querySelector("#change").addEventListener("click", async () => {
  await fetch("/control/change", { method: "POST" });
  await refreshLog();
  status.textContent =
    "Origin changed. Predict whether the next browser fetch will see it.";
});
refreshLog().catch((error) => {
  status.textContent = error.message;
});
