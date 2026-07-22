import "./style.css";
import { store } from "./state";
import { renderHome } from "./screens/home";
import { renderSetup } from "./screens/setup";
import { renderScan } from "./screens/scan";
import { renderInput } from "./screens/input";
import { renderResult } from "./screens/result";
import { renderLearn } from "./screens/learn";

const app = document.querySelector<HTMLDivElement>("#app")!;

function render() {
  const state = store.state;
  app.innerHTML = "";
  const phone = document.createElement("div");
  phone.className = "phone-frame";
  const inner = document.createElement("div");
  inner.className = "phone-inner";
  phone.append(inner);
  app.append(phone);

  switch (state.screen) {
    case "home":
      renderHome(inner);
      break;
    case "setup":
      renderSetup(inner, state);
      break;
    case "scan-hero":
      renderScan(inner, state, "hero");
      break;
    case "scan-board":
      renderScan(inner, state, "board");
      break;
    case "input":
      renderInput(inner, state);
      break;
    case "result":
      renderResult(inner, state);
      break;
    case "learn":
      renderLearn(inner);
      break;
  }
}

store.subscribe(render);
render();
