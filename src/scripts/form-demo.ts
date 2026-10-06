export {};
document
  .querySelectorAll<HTMLButtonElement>("[data-house-filter]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-house-filter]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      let count = 0;
      document.querySelectorAll<HTMLElement>("[data-house]").forEach((card) => {
        card.hidden =
          button.dataset.houseFilter !== "all" &&
          card.dataset.house !== button.dataset.houseFilter;
        if (!card.hidden) count++;
      });
      document.querySelector("#house-filter-status")!.textContent =
        `${count.toLocaleString("fa-IR")} پروژه نمایش داده می‌شود.`;
    }),
  );
const form = document.querySelector<HTMLFormElement>("#architecture-form");
if (form) {
  form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled =
    false;
  const edit = form.querySelector<HTMLElement>("[data-inquiry-edit]")!;
  const review = form.querySelector<HTMLElement>("[data-inquiry-review]")!;
  const status = form.querySelector<HTMLElement>("#architecture-status")!;
  const success = form.querySelector<HTMLElement>("[data-inquiry-success]")!;
  function setStage(n: number) {
    document.querySelectorAll<HTMLElement>("[data-inquiry-stage]").forEach((step) => {
      if (Number(step.dataset.inquiryStage) === n) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let invalid: HTMLInputElement | HTMLTextAreaElement | undefined;
    for (const [name, min] of [
      ["name", 2],
      ["description", 10],
    ] as const) {
      const input = form.elements.namedItem(name) as
        HTMLInputElement | HTMLTextAreaElement;
      const valid = input.value.trim().length >= min;
      input.setAttribute("aria-invalid", String(!valid));
      form.querySelector(`[data-error="${name}"]`)!.textContent = valid
        ? ""
        : name === "name"
          ? "نام را با دست‌کم دو حرف وارد کنید."
          : "نیازتان را با دست‌کم ده حرف توضیح دهید.";
      if (!valid && !invalid) invalid = input;
    }
    if (invalid) {
      invalid.focus();
      return;
    }
    const data = new FormData(form);
    const list = form.querySelector("[data-inquiry-summary]")!;
    list.replaceChildren();
    for (const [label, key] of [
      ["نام", "name"],
      ["نوع فضا", "type"],
      ["متراژ حدودی", "size"],
      ["نیاز", "description"],
    ]) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = String(data.get(key) || "مشخص نشده");
      list.append(dt, dd);
    }
    edit.hidden = true;
    review.hidden = false;
    status.textContent = "";
    setStage(2);
    review.focus();
  });
  form.querySelector("[data-inquiry-back]")?.addEventListener("click", () => {
    review.hidden = true;
    edit.hidden = false;
    setStage(1);
    (form.elements.namedItem("name") as HTMLInputElement).focus();
    status.textContent = "اطلاعات برای ویرایش حفظ شده است.";
  });
  form
    .querySelector<HTMLButtonElement>("[data-inquiry-confirm]")
    ?.addEventListener("click", (event) => {
      status.textContent =
        "درخواست نمایشی آماده شد. هیچ اطلاعاتی ارسال یا ذخیره نشده است.";
      (event.currentTarget as HTMLButtonElement).disabled = true;
      review.hidden = true;
      success.hidden = false;
      form.reset();
      form.querySelector("[data-inquiry-summary]")?.replaceChildren();
      setStage(3);
      success.focus();
    });
  form.querySelector("[data-inquiry-restart]")?.addEventListener("click", () => {
    success.hidden = true;
    edit.hidden = false;
    status.textContent = "";
    form.querySelectorAll("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));
    form.querySelectorAll("[data-error]").forEach((error) => error.textContent = "");
    form.querySelector<HTMLButtonElement>("[data-inquiry-confirm]")!.disabled = false;
    setStage(1);
    (form.elements.namedItem("name") as HTMLInputElement).focus();
  });
  form.addEventListener("input", () => {
    const confirm = form.querySelector<HTMLButtonElement>(
      "[data-inquiry-confirm]",
    );
    if (confirm) confirm.disabled = false;
  });
}
