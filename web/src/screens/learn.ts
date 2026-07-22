import { h } from "../components";
import { HAND_CATEGORY_LABEL_KO, HandCategory } from "../poker/handEvaluator";
import { store } from "../state";

const HAND_ORDER: HandCategory[] = [
  HandCategory.STRAIGHT_FLUSH,
  HandCategory.FOUR_OF_A_KIND,
  HandCategory.FULL_HOUSE,
  HandCategory.FLUSH,
  HandCategory.STRAIGHT,
  HandCategory.THREE_OF_A_KIND,
  HandCategory.TWO_PAIR,
  HandCategory.ONE_PAIR,
  HandCategory.HIGH_CARD,
];

const HAND_DESC: Record<HandCategory, string> = {
  [HandCategory.STRAIGHT_FLUSH]: "같은 무늬로 연속된 5장 (가장 강함)",
  [HandCategory.FOUR_OF_A_KIND]: "같은 숫자 4장",
  [HandCategory.FULL_HOUSE]: "트리플 + 원페어",
  [HandCategory.FLUSH]: "같은 무늬 5장",
  [HandCategory.STRAIGHT]: "숫자가 연속된 5장 (무늬 무관)",
  [HandCategory.THREE_OF_A_KIND]: "같은 숫자 3장",
  [HandCategory.TWO_PAIR]: "페어 2쌍",
  [HandCategory.ONE_PAIR]: "같은 숫자 2장",
  [HandCategory.HIGH_CARD]: "위 조합이 없을 때, 가장 높은 카드로 승부",
};

export function renderLearn(root: HTMLElement) {
  const screen = h("div", { class: "screen screen-learn" });
  const scroll = h("div", { class: "learn-scroll" });

  scroll.append(h("h2", { class: "learn-h" }, ["포커 기초 배우기"]));

  const handList = h("div", { class: "hand-list" });
  HAND_ORDER.forEach((cat, i) => {
    handList.append(
      h("div", { class: "hand-item" }, [
        h("span", { class: "hand-rank" }, [String(i + 1)]),
        h("span", { class: "hand-name" }, [HAND_CATEGORY_LABEL_KO[cat]]),
        h("span", { class: "hand-desc" }, [HAND_DESC[cat]]),
      ]),
    );
  });
  scroll.append(learnCard("족보 순위 (강한 순)", [handList]));

  scroll.append(
    learnCard("팟 오즈(Pot Odds)란?", [
      p(
        "상대가 베팅했을 때, 내가 콜해서 얻을 수 있는 배당 대비 비용의 비율이에요. " +
          "필요 승률 = 콜 금액 ÷ (팟 + 콜 금액). " +
          "예를 들어 팟 100에 상대가 20을 베팅하면 20 ÷ (100 + 20) = 약 16.7%. " +
          "즉 내 승률이 16.7%보다 높으면 콜은 수학적으로 이득이에요.",
      ),
    ]),
  );

  scroll.append(
    learnCard("승률(Equity)이란?", [
      p(
        "지금 카드 상태에서 남은 카드가 모두 나왔을 때, 내가 이길 확률(무승부는 절반으로 계산)이에요. " +
          "이 앱은 상대 카드를 알 수 없다고 가정하고, 수천~수만 번의 가상 게임을 돌려서(몬테카를로 시뮬레이션) 이 확률을 추정해요.",
      ),
    ]),
  );

  scroll.append(
    learnCard("아웃츠(Outs)란?", [
      p(
        "내 핸드를 더 좋게 만들어줄 수 있는 '남은 카드의 장수'예요. " +
          "예를 들어 플러시 드로우(같은 무늬 4장)라면 같은 무늬 카드가 9장 남아있으니 아웃츠는 9장. " +
          "간단 계산법(rule of 4/2): 남은 카드가 2장일 때는 아웃츠×4%, 1장 남았을 때는 아웃츠×2%가 대략적인 승률이에요.",
      ),
    ]),
  );

  scroll.append(
    learnCard("헤즈업(둘이서) 기본 전략 팁", [
      p("• 상대가 한 명뿐이므로 핸드 범위가 넓어져요. 페어나 좋은 하이카드는 생각보다 자주 이깁니다."),
      p("• 팟 오즈보다 승률이 낮으면 과감히 폴드하세요. '아깝다'는 감정은 손해로 이어집니다."),
      p("• 승률이 매우 높을 땐 체크보다 베팅해서 상대의 돈을 더 가져오세요 (밸류 베팅)."),
      p("• 이 앱의 추천은 순수 수학(승률 vs 팟 오즈) 기준이며, 상대의 블러프 성향까지는 고려하지 않아요. 참고용으로 활용하세요."),
    ]),
  );

  const backBtn = h("button", { class: "btn btn-solid", type: "button" }, ["돌아가기"]);
  backBtn.addEventListener("click", () => store.goto(store.state.cameFrom));
  scroll.append(backBtn);

  screen.append(scroll);
  root.append(screen);
}

function learnCard(title: string, body: Node[]): HTMLElement {
  return h("div", { class: "learn-card" }, [h("h3", { class: "learn-card-title" }, [title]), ...body]);
}

function p(content: string): HTMLElement {
  return h("p", { class: "learn-text" }, [content]);
}
