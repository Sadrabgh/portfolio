const form = document.querySelector<HTMLFormElement>("#contact-form");
if (form) {
  let brief = "";
  const status = form.querySelector<HTMLElement>(".form-status")!;
  const result = form.querySelector<HTMLElement>(".request-result")!;
  const service = form.elements.namedItem("service") as HTMLSelectElement;
  const preset = new URLSearchParams(location.search).get("service");
  if (preset && ["01", "02", "03", "04"].includes(preset))
    service.value = preset;
  const fields = ["name", "contact", "service", "message"];
  const value = (id: string) =>
    (form.elements.namedItem(id) as HTMLInputElement).value.trim();
  const errors = () => {
    const output: Record<string, string> = {};
    if (value("name").length < 2)
      output.name = "نام را با حداقل دو حرف بنویسید.";
    const c = value("contact");
    const digits = c
      .replace(/[۰-۹]/g, (x) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(x)))
      .replace(/[٠-٩]/g, (x) => String("٠١٢٣٤٥٦٧٨٩".indexOf(x)));
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) &&
      !/^\+?[\d\s()-]{8,20}$/.test(digits)
    )
      output.contact = "یک ایمیل معتبر یا شمارهٔ تماس بنویسید.";
    if (!value("service")) output.service = "نوع پروژه را انتخاب کنید.";
    if (value("message").length < 20)
      output.message = "حداقل ۲۰ نویسه دربارهٔ نیازتان بنویسید.";
    fields.forEach((id) => {
      const el = form.elements.namedItem(id) as HTMLInputElement;
      el.setAttribute("aria-invalid", String(Boolean(output[id])));
      form.querySelector(`#${id}-error`)!.textContent = output[id] || "";
    });
    return output;
  };
  fields.forEach((id) =>
    (form.elements.namedItem(id) as HTMLElement).addEventListener(
      "input",
      () => {
        if (
          (form.elements.namedItem(id) as HTMLElement).getAttribute(
            "aria-invalid",
          ) === "true"
        )
          errors();
        result.hidden = true;
      },
    ),
  );
  form.addEventListener("input", () => {
    brief = "";
    result.hidden = true;
    status.textContent = "";
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    result.hidden = true;
    status.textContent = "";
    status.classList.remove("error");
    const invalid = errors();
    if (Object.keys(invalid).length) {
      (form.elements.namedItem(Object.keys(invalid)[0]) as HTMLElement).focus();
      return;
    }
    if (value("website")) return;
    const data = Object.fromEntries(new FormData(form));
    brief = `درخواست طراحی سایت\n\nنام: ${value("name")}\nراه ارتباط: ${value("contact")}\nنوع پروژه: ${service.selectedOptions[0].text}\nکسب‌وکار: ${value("company") || "مشخص نشده"}\nبودجه: ${value("budget") || "مشخص نشده"}\nزمان: ${value("timeline")}\n\nشرح پروژه:\n${value("message")}`;
    if (!form.dataset.endpoint) {
      result.querySelector("pre")!.textContent = brief;
      result.hidden = false;
      const mail = result.querySelector<HTMLAnchorElement>("[data-mail]");
      if (mail)
        mail.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent("درخواست همکاری طراحی سایت")}&body=${encodeURIComponent(brief)}`;
      return;
    }
    const submit = form.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    )!;
    submit.disabled = true;
    status.textContent = "در حال ارسال درخواست…";
    try {
      const response = await fetch(form.dataset.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json();
      if (!response.ok || payload.success !== true)
        throw new Error("send failed");
      status.textContent = "درخواست شما دریافت شد. ممنون از توضیحاتتان.";
      form.reset();
    } catch {
      status.textContent =
        "ارسال انجام نشد. متن شما حفظ شده؛ دوباره تلاش کنید یا درخواست را ذخیره کنید.";
      status.classList.add("error");
      result.querySelector("pre")!.textContent = brief;
      result.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });
  form.querySelector("[data-download]")?.addEventListener("click", () => {
    const blob = new Blob(["\uFEFF" + brief], {
      type: "text/plain;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "project-request.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  });
  form.querySelector("[data-copy]")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(brief);
      status.textContent = "متن درخواست کپی شد.";
    } catch {
      status.textContent =
        "امکان کپی خودکار نیست؛ متن درخواست را انتخاب و کپی کنید.";
    }
  });
  // Enable submission only once its handler can prevent native GET submission.
  form.querySelector<HTMLButtonElement>("button[type=submit]")!.disabled =
    false;
}
