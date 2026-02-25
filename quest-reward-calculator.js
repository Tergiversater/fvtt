(() => {
  const MONEY_DECIMALS = 0;

  const generateId = () => {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const getDefaultState = () => ({
    baseMonthlyIncome: 700,
    workDaysPerMonth: 35,
    urgencyCoef: 1,
    expensesFixed: 0,
    expensesPerDay: 0,
    blocks: [
      { id: generateId(), label: "Дорога туди", days: 0, riskCoef: 1, difficultyCoef: 1 },
      { id: generateId(), label: "На місці", days: 1, riskCoef: 1, difficultyCoef: 1 },
      { id: generateId(), label: "Дорога назад", days: 0, riskCoef: 1, difficultyCoef: 1 }
    ]
  });

  const cloneState = state => structuredClone(state);

  const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const normalizeBlock = (block, index) => ({
    id: block.id || generateId(),
    label: (block.label || "").trim() || `Етап ${index + 1}`,
    days: toNumber(block.days),
    riskCoef: toNumber(block.riskCoef, 1),
    difficultyCoef: toNumber(block.difficultyCoef, 1)
  });

  const validateState = state => {
    if (state.workDaysPerMonth <= 0) return { ok: false, error: "Робочих днів у місяць має бути більше 0." };
    if (state.baseMonthlyIncome < 0) return { ok: false, error: "Базовий місячний дохід не може бути від'ємним." };
    if (state.urgencyCoef <= 0) return { ok: false, error: "Коефіцієнт терміновості має бути більше 0." };
    if (state.expensesFixed < 0) return { ok: false, error: "Фіксовані витрати не можуть бути від'ємними." };
    if (state.expensesPerDay < 0) return { ok: false, error: "Витрати на день не можуть бути від'ємними." };

    for (let i = 0; i < state.blocks.length; i += 1) {
      const block = state.blocks[i];
      if (block.days < 0) return { ok: false, error: `Етап ${i + 1}: дні не можуть бути від'ємними.` };
      if (block.riskCoef <= 0) return { ok: false, error: `Етап ${i + 1}: коефіцієнт ризику має бути більше 0.` };
      if (block.difficultyCoef <= 0) return { ok: false, error: `Етап ${i + 1}: коефіцієнт складності має бути більше 0.` };
    }

    return { ok: true };
  };

  const calculate = state => {
    const baseDayPay = state.baseMonthlyIncome / state.workDaysPerMonth;
    const daysTotal = state.blocks.reduce((sum, block) => sum + block.days, 0);

    const blocks = state.blocks.map(block => {
      const payBlock = block.days
        * baseDayPay
        * block.riskCoef
        * block.difficultyCoef
        * state.urgencyCoef;

      return { ...block, payBlock };
    });

    const payTotal = blocks.reduce((sum, block) => sum + block.payBlock, 0);
    const perDayTotal = state.expensesPerDay * daysTotal;
    const expensesTotal = state.expensesFixed + perDayTotal;
    const finalReward = payTotal + expensesTotal;

    return {
      baseDayPay,
      daysTotal,
      payTotal,
      expensesTotal,
      finalReward,
      blocks,
      expensesBreakdown: {
        fixed: state.expensesFixed,
        perDay: state.expensesPerDay,
        perDayTotal
      }
    };
  };

  const money = value => value.toFixed(MONEY_DECIMALS);
  const coef = value => Number(value).toFixed(2);

  const renderBlocksRows = blocks => blocks.map((block, index) => `
    <tr data-block-id="${block.id}">
      <td><input type="text" name="label" value="${foundry.utils.escapeHTML(block.label)}"/></td>
      <td><input type="number" name="days" value="${block.days}" min="0" step="1"/></td>
      <td><input type="number" name="riskCoef" value="${block.riskCoef}" min="0" step="0.05"/></td>
      <td><input type="number" name="difficultyCoef" value="${block.difficultyCoef}" min="0" step="0.05"/></td>
      <td><button type="button" class="qrc-remove" data-block-id="${block.id}">Видалити</button></td>
    </tr>
  `).join("");

  const renderResult = result => {
    const blocksHtml = result.blocks.map((block, idx) => `
      <tr>
        <td>${idx + 1}. ${foundry.utils.escapeHTML(block.label)}</td>
        <td>${block.days}</td>
        <td>${coef(block.riskCoef)}</td>
        <td>${coef(block.difficultyCoef)}</td>
        <td>${money(block.payBlock)}</td>
      </tr>
    `).join("");

    return `
      <div class="qrc-result-output">
        <p><strong>Базова ставка за день:</strong> ${money(result.baseDayPay)}</p>
        <p><strong>Загалом днів:</strong> ${result.daysTotal}</p>
        <table>
          <thead>
            <tr><th>Етап</th><th>Дні</th><th>Ризик</th><th>Складність</th><th>Оплата</th></tr>
          </thead>
          <tbody>${blocksHtml}</tbody>
        </table>
        <p><strong>Оплата праці (payTotal):</strong> ${money(result.payTotal)}</p>
        <p><strong>Витрати (expensesTotal):</strong> ${money(result.expensesTotal)} = ${money(result.expensesBreakdown.fixed)} + (${money(result.expensesBreakdown.perDay)} × ${result.daysTotal} = ${money(result.expensesBreakdown.perDayTotal)})</p>
        <p><strong>Підсумкова винагорода (finalReward):</strong> ${money(result.finalReward)}</p>
      </div>
    `;
  };

  const readStateFromHtml = html => {
    const root = html[0] ?? html;
    const field = name => root.querySelector(`[name="${name}"]`);
    const rows = [...root.querySelectorAll("tbody[data-blocks] tr[data-block-id]")];

    return {
      baseMonthlyIncome: toNumber(field("baseMonthlyIncome")?.value),
      workDaysPerMonth: toNumber(field("workDaysPerMonth")?.value),
      urgencyCoef: toNumber(field("urgencyCoef")?.value, 1),
      expensesFixed: toNumber(field("expensesFixed")?.value),
      expensesPerDay: toNumber(field("expensesPerDay")?.value),
      blocks: rows.map((row, index) => normalizeBlock({
        id: row.dataset.blockId,
        label: row.querySelector('[name="label"]')?.value,
        days: row.querySelector('[name="days"]')?.value,
        riskCoef: row.querySelector('[name="riskCoef"]')?.value,
        difficultyCoef: row.querySelector('[name="difficultyCoef"]')?.value
      }, index))
    };
  };

  const renderDialog = initialState => {
    let state = cloneState(initialState);
    let lastResult = null;

    const content = `
      <form class="qrc-form" style="display:flex; flex-direction:column; gap:10px;">
        <fieldset>
          <legend><strong>Базові параметри</strong></legend>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <label>Базовий місячний дохід <input type="number" name="baseMonthlyIncome" min="0" step="1" value="${state.baseMonthlyIncome}"/></label>
            <label>Робочих днів у місяць <input type="number" name="workDaysPerMonth" min="1" step="1" value="${state.workDaysPerMonth}"/></label>
            <label>Коефіцієнт терміновості <input type="number" name="urgencyCoef" min="0" step="0.05" value="${state.urgencyCoef}"/></label>
          </div>
        </fieldset>

        <fieldset>
          <legend><strong>Витрати</strong></legend>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <label>Витрати фіксовані <input type="number" name="expensesFixed" min="0" step="1" value="${state.expensesFixed}"/></label>
            <label>Витрати на день <input type="number" name="expensesPerDay" min="0" step="1" value="${state.expensesPerDay}"/></label>
          </div>
        </fieldset>

        <fieldset>
          <legend><strong>Етапи</strong></legend>
          <table>
            <thead>
              <tr><th>Назва</th><th>Дні</th><th>Ризик</th><th>Складність</th><th></th></tr>
            </thead>
            <tbody data-blocks>
              ${renderBlocksRows(state.blocks)}
            </tbody>
          </table>
          <button type="button" class="qrc-add">Додати етап</button>
        </fieldset>

        <div style="display:flex; gap:8px;">
          <button type="button" class="qrc-calc">Розрахувати</button>
          <button type="button" class="qrc-reset">Скинути</button>
          <button type="button" class="qrc-chat" disabled>В чат</button>
        </div>

        <fieldset>
          <legend><strong>Результат</strong></legend>
          <div class="qrc-result">Натисніть “Розрахувати”.</div>
        </fieldset>
      </form>
    `;

    const dialog = new Dialog({
      title: "Калькулятор винагороди за квест",
      content,
      buttons: {
        close: {
          label: "Закрити"
        }
      },
      render: html => {
        const root = html[0];
        const blocksTbody = root.querySelector("tbody[data-blocks]");
        const resultBox = root.querySelector(".qrc-result");
        const chatButton = root.querySelector(".qrc-chat");

        const rerenderBlocks = () => {
          blocksTbody.innerHTML = renderBlocksRows(state.blocks);
        };

        root.addEventListener("click", event => {
          const target = event.target;

          if (target.closest(".qrc-add")) {
            state = readStateFromHtml(root);
            state.blocks.push({
              id: generateId(),
              label: `Етап ${state.blocks.length + 1}`,
              days: 0,
              riskCoef: 1,
              difficultyCoef: 1
            });
            rerenderBlocks();
            return;
          }

          const removeButton = target.closest(".qrc-remove");
          if (removeButton) {
            state = readStateFromHtml(root);
            const id = removeButton.dataset.blockId;
            state.blocks = state.blocks.filter(block => block.id !== id);
            if (!state.blocks.length) {
              state.blocks.push({ id: generateId(), label: "Етап 1", days: 0, riskCoef: 1, difficultyCoef: 1 });
            }
            rerenderBlocks();
            return;
          }

          if (target.closest(".qrc-reset")) {
            state = getDefaultState();
            lastResult = null;
            chatButton.disabled = true;
            dialog.close();
            renderDialog(state);
            return;
          }

          if (target.closest(".qrc-calc")) {
            state = readStateFromHtml(root);
            const validation = validateState(state);
            if (!validation.ok) {
              ui.notifications.error(validation.error);
              return;
            }

            lastResult = calculate(state);
            resultBox.innerHTML = renderResult(lastResult);
            chatButton.disabled = false;
            return;
          }

          if (target.closest(".qrc-chat")) {
            if (!lastResult) {
              ui.notifications.warn("Спочатку виконайте розрахунок.");
              return;
            }

            const summary = [
              `<p><strong>Винагорода:</strong> ${money(lastResult.finalReward)}</p>`,
              `<p>Дні: ${lastResult.daysTotal}, Витрати: ${money(lastResult.expensesTotal)}</p>`
            ].join("");

            ChatMessage.create({ content: summary });
            ui.notifications.info("Підсумок надіслано в чат.");
          }
        });
      }
    });

    dialog.render(true);
  };

  renderDialog(getDefaultState());
})();
