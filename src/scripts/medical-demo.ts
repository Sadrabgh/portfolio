import { doctors } from "../data/brands";
import {
  appointmentKey,
  availableSlots,
  dayISO,
  isUpcoming,
  nearestSlot,
  persianDate,
  persianDay,
  persianTime,
  readAppointments,
  weekday,
  writeAppointments,
  type Appointment,
} from "./medical-calendar";
const doctorName = (id: string) => doctors.find((d) => d.id === id)!.name;
function updateNearest() {
  document
    .querySelectorAll<HTMLElement>("[data-nearest-label]")
    .forEach((el) => {
      const id = el.dataset.nearestLabel!;
      const nearest = nearestSlot(id);
      el.textContent = nearest
        ? `${persianDate(nearest.date, "short")} · ${persianTime(nearest.time)}`
        : "در ۲۱ روز آینده زمان آزاد وجود ندارد.";
      const links = document.querySelectorAll<HTMLAnchorElement>(
        `[data-nearest-book="${id}"]`,
      );
      links.forEach((link) => { if (nearest) {
        const target = new URL(link.href);
        target.searchParams.set("date", nearest.date);
        target.searchParams.set("time", nearest.time);
        link.href = target.href;
      } });
    });
}
updateNearest();
window.addEventListener("pageshow", (event) => {
  if (event.persisted) updateNearest();
});
document
  .querySelectorAll<HTMLButtonElement>("[data-doctor-filter]")
  .forEach((b) =>
    b.addEventListener("click", () => {
      document
        .querySelectorAll("[data-doctor-filter]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      let count = 0;
      document
        .querySelectorAll<HTMLElement>("[data-doctor]")
        .forEach((card) => {
          card.hidden =
            b.dataset.doctorFilter !== "all" &&
            card.dataset.doctor !== b.dataset.doctorFilter;
          if (!card.hidden) count++;
        });
      document.querySelector("[data-doctor-filter-status]")!.textContent =
        `${count.toLocaleString("fa-IR")} حوزهٔ خدمات نمایش داده می‌شود.`;
    }),
  );
const app = document.querySelector<HTMLElement>("[data-booking-app]");
if (app) {
  const compactSummary = app.querySelector<HTMLDetailsElement>(
    "[data-book-summary]",
  );
  if (compactSummary && matchMedia("(max-width: 760px)").matches)
    compactSummary.open = false;
  const query = new URLSearchParams(location.search);
  const reschedule = query.get("reschedule") || "";
  const previous = readAppointments().find(
    (a) => a.id === reschedule && a.status === "booked" && isUpcoming(a),
  );
  let doctor =
    previous?.doctor ||
    (doctors.some((d) => d.id === query.get("doctor"))
      ? query.get("doctor")!
      : "");
  let date = "",
    time = "",
    week = 0,
    step = doctor ? 2 : 1,
    completed = false;
  const requestedDate = query.get("date") || "";
  const requestedTime = query.get("time") || "";
  const days = Array.from({ length: 21 }, (_, i) => dayISO(i));
  if (previous && days.includes(previous.date)) {
    date = previous.date;
    time = previous.time;
  } else if (doctor && days.includes(requestedDate)) {
    date = requestedDate;
    if (availableSlots(doctor, date).includes(requestedTime))
      time = requestedTime;
  }
  if (date) week = Math.floor(days.indexOf(date) / 7);
  const form = app.querySelector<HTMLFormElement>("#booking-form")!;
  const status = app.querySelector<HTMLElement>("[data-book-status]")!;
  function feedback(message = "", state = "error") {
    status.textContent = message;
    status.dataset.state = message ? state : "";
  }
  const next = app.querySelector<HTMLButtonElement>("[data-book-next]")!;
  next.disabled = false;
  const back = app.querySelector<HTMLButtonElement>("[data-book-back]")!;
  function summary() {
    app!.querySelector("[data-summary-doctor]")!.textContent = doctor
      ? doctorName(doctor)
      : "هنوز انتخاب نشده";
    app!.querySelector("[data-summary-time]")!.textContent = date
      ? `${persianDate(date, "short")}${time ? " · " + persianTime(time) : " · ساعت انتخاب نشده"}`
      : "هنوز انتخاب نشده";
    const d = doctors.find((d) => d.id === doctor);
    app!.querySelectorAll<HTMLElement>("[data-summary-profile]").forEach((profile) => {
      profile.hidden = profile.dataset.summaryProfile !== doctor;
    });
    app!.querySelector("[data-summary-fee]")!.textContent = d
      ? `${d.duration.toLocaleString("fa-IR")} دقیقه · ${d.fee.toLocaleString("fa-IR")} تومان`
      : "پس از انتخاب پزشک";
    app!
      .querySelectorAll<HTMLButtonElement>("[data-book-doctor]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.bookDoctor === doctor)),
      );
  }
  function slots() {
    const area = app!.querySelector("[data-time-slots]")!;
    area.replaceChildren();
    const text = app!.querySelector("[data-slot-status]")!;
    if (!date) {
      text.textContent = "یک روز را انتخاب کنید.";
      return;
    }
    const available = availableSlots(doctor, date, previous?.id);
    app!.querySelector("[data-slot-heading]")!.textContent =
      `ساعت‌های آزاد · ${persianDate(date, "short")}`;
    if (time && !available.includes(time)) time = "";
    if (!available.length) {
      text.textContent =
        "در این روز نوبت آزاد وجود ندارد؛ روز دیگری یا نزدیک‌ترین زمان آزاد را انتخاب کنید.";
      summary();
      return;
    }
    text.textContent = `${available.length.toLocaleString("fa-IR")} زمان آزاد · به وقت تهران`;
    for (const slot of available) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "booking-slot";
      b.dataset.bookTime = slot;
      b.textContent = persianTime(slot);
      b.setAttribute("aria-pressed", String(slot === time));
      b.setAttribute("aria-label", `ساعت ${persianTime(slot)}`);
      b.onclick = () => {
        time = slot;
        area
          .querySelectorAll("[data-book-time]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        feedback();
        summary();
      };
      area.append(b);
    }
    summary();
  }
  function calendar() {
    const area = app!.querySelector("[data-calendar-days]")!;
    area.replaceChildren();
    app!.querySelector("[data-calendar-heading]")!.textContent =
      `${persianDate(days[week * 7], "short")} تا ${persianDate(days[Math.min(week * 7 + 6, 20)], "short")}`;
    app!.querySelector<HTMLButtonElement>('[data-week="-1"]')!.disabled =
      week === 0;
    app!.querySelector<HTMLButtonElement>('[data-week="1"]')!.disabled =
      week === 2;
    for (const day of days.slice(week * 7, week * 7 + 7)) {
      const available = availableSlots(doctor, day, previous?.id);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "booking-day";
      b.dataset.bookDate = day;
      b.setAttribute("aria-pressed", String(day === date));
      b.setAttribute(
        "aria-label",
        `${persianDate(day)}، ${available.length ? available.length.toLocaleString("fa-IR") + " زمان آزاد" : "بدون نوبت آزاد"}`,
      );
      const dayName = document.createElement("span");
      dayName.textContent = weekday(day);
      const number = document.createElement("strong");
      number.textContent = persianDay(day);
      const availability = document.createElement("span");
      availability.textContent = available.length ? `${available.length.toLocaleString("fa-IR")} زمان` : "بدون نوبت";
      b.append(dayName, number, availability);
      b.onclick = () => {
        date = day;
        time = "";
        area
          .querySelectorAll("[data-book-date]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        feedback();
        slots();
        summary();
      };
      area.append(b);
    }
    slots();
  }
  function review() {
    const area = app!.querySelector("[data-booking-review]")!;
    area.replaceChildren();
    const d = doctors.find((x) => x.id === doctor)!;
    const dl = document.createElement("dl");
    const data = new FormData(form);
    for (const [label, value] of [
      ["پزشک", d.name],
      ["زمان", `${persianDate(date)} · ${persianTime(time)}`],
      ["محل در سناریو", d.room],
      ["هزینهٔ فرضی", `${d.fee.toLocaleString("fa-IR")} تومان`],
      ["نام آزمایشی", String(data.get("name"))],
      ["شمارهٔ آزمایشی", String(data.get("phone"))],
    ]) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      dl.append(dt, dd);
    }
    area.append(dl);
  }
  function showStep(value: number, focus = true, clear = true) {
    const direction = value > step ? 1 : -1;
    const changed = value !== step;
    step = value;
    app!
      .querySelectorAll<HTMLElement>("[data-booking-step]")
      .forEach((el) => (el.hidden = Number(el.dataset.bookingStep) !== step));
    app!
      .querySelectorAll<HTMLElement>("[data-step-indicator]")
      .forEach((el) => {
        el.dataset.state = Number(el.dataset.stepIndicator) < step ? "complete" : "pending";
        if (Number(el.dataset.stepIndicator) === step)
          el.setAttribute("aria-current", "step");
        else el.removeAttribute("aria-current");
      });
    app!.querySelector("[data-summary-step]")!.textContent = `قدم ${step.toLocaleString("fa-IR")} از ۴`;
    app!.querySelector("[data-summary-hint]")!.textContent = [
      "خدمت، مدت و هزینه را کنار هم بررسی کنید.", "روزهای آزاد را ببینید؛ نزدیک‌ترین زمان هم قابل انتخاب است.",
      "از اطلاعات آزمایشی استفاده کنید. نام و شماره ذخیره نمی‌شوند.", "پیش از تأیید، پزشک و زمان را یک بار دیگر بررسی کنید.",
    ][step - 1];
    next.textContent =
      step === 4
        ? previous
          ? "تأیید تغییر زمان"
          : "تأیید نوبت نمایشی"
        : "ادامه";
    back.hidden = step === 1;
    if (clear) feedback();
    if (step === 2) {
      const d = doctors.find((x) => x.id === doctor);
      app!.querySelector("[data-selected-doctor-note]")!.textContent = d
        ? `${d.name} · ${d.duration.toLocaleString("fa-IR")} دقیقه · ${d.room}`
        : "";
      calendar();
    }
    if (step === 4) review();
    summary();
    if (focus)
      app!
        .querySelector<HTMLElement>(
          `[data-booking-step="${step}"] [data-step-title]`,
        )
        ?.focus();
    app!.querySelectorAll<HTMLElement>("[data-booking-step]").forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
    if(changed && focus && document.documentElement.dataset.demoMotion!=="reduce") {
      const panel=app!.querySelector<HTMLElement>(`[data-booking-step="${step}"]`)!;
      // RTL progression: the next view arrives from the left; focus changes immediately.
      panel.animate([{opacity:0,transform:`translateX(${-direction*12}px)`},{opacity:1,transform:"translateX(0)"}],{duration:220,easing:"cubic-bezier(.22,1,.36,1)"});
    }
  }
  addEventListener("brand-motion",()=>app!.querySelectorAll("[data-booking-step]").forEach(el=>el.getAnimations().forEach(a=>a.cancel())));
  app.querySelectorAll<HTMLButtonElement>("[data-book-doctor]").forEach((b) =>
    b.addEventListener("click", () => {
      if (doctor !== b.dataset.bookDoctor) {
        doctor = b.dataset.bookDoctor!;
        date = "";
        time = "";
        week = 0;
      }
      feedback();
      summary();
    }),
  );
  app.querySelectorAll<HTMLButtonElement>("[data-week]").forEach((b) =>
    b.addEventListener("click", () => {
      week = Math.max(0, Math.min(2, week + Number(b.dataset.week)));
      calendar();
    }),
  );
  app.querySelector("[data-book-nearest]")?.addEventListener("click", () => {
    const nearest = nearestSlot(doctor, previous?.id);
    if (!nearest) {
      feedback("در بازهٔ فعلی زمان آزاد وجود ندارد.");
      return;
    }
    date = nearest.date;
    time = nearest.time;
    week = Math.floor(days.indexOf(date) / 7);
    calendar();
    summary();
    feedback(`نزدیک‌ترین زمان انتخاب شد: ${persianDate(date, "short")} · ${persianTime(time)}`, "ready");
  });
  back.addEventListener("click", () => showStep(step - 1));
  app
    .querySelectorAll<HTMLButtonElement>("[data-book-edit]")
    .forEach((b) =>
      b.addEventListener("click", () => showStep(Number(b.dataset.bookEdit))),
    );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (completed) return;
    if (step === 1) {
      if (!doctor) {
        feedback("یک پزشک انتخاب کنید.");
        app!.querySelector<HTMLButtonElement>("[data-book-doctor]")?.focus();
        return;
      }
      showStep(2);
      return;
    }
    if (step === 2) {
      if (!date || !time) {
        feedback("روز و ساعت آزاد را انتخاب کنید.");
        return;
      }
      if (!availableSlots(doctor, date, previous?.id).includes(time)) {
        time = "";
        showStep(2);
        feedback("این زمان دیگر آزاد نیست؛ ساعت دیگری انتخاب کنید.");
        return;
      }
      showStep(3);
      return;
    }
    if (step === 3) {
      const name = form.elements.namedItem("name") as HTMLInputElement;
      const phone = form.elements.namedItem("phone") as HTMLInputElement;
      const normalized = phone.value
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[\s-]/g, "");
      phone.value = normalized;
      const nameOK = name.value.trim().length >= 2;
      const phoneOK = /^(09\d{9}|\+989\d{9})$/.test(normalized);
      name.setAttribute("aria-invalid", String(!nameOK));
      phone.setAttribute("aria-invalid", String(!phoneOK));
      app!.querySelector('[data-book-error="name"]')!.textContent = nameOK
        ? ""
        : "نام را با دست‌کم دو حرف وارد کنید.";
      app!.querySelector('[data-book-error="phone"]')!.textContent = phoneOK
        ? ""
        : "شماره را مانند 09123456789 وارد کنید.";
      if (!nameOK || !phoneOK) {
        (!nameOK ? name : phone).focus();
        return;
      }
      showStep(4);
      return;
    }
    if (!availableSlots(doctor, date, previous?.id).includes(time)) {
      time = "";
      showStep(2);
      feedback("این زمان در صفحهٔ دیگری انتخاب شده است؛ ساعت دیگری انتخاب کنید.");
      return;
    }
    const rows = readAppointments();
    if (previous) {
      const old = rows.find((a) => a.id === previous.id);
      if (!old || old.status !== "booked") {
        showStep(2);
        feedback("نوبت قبلی در صفحهٔ دیگری تغییر کرده است. نوبت‌های من را بررسی کنید.");
        return;
      }
    }
    const record: Appointment = {
      id: previous?.id || `AV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      doctor,
      date,
      time,
      status: "booked",
    };
    const updated = previous
      ? rows.map((a) => (a.id === record.id ? record : a))
      : [...rows, record];
    if (!writeAppointments(updated)) {
      feedback("مرورگر ذخیره‌سازی را اجازه نمی‌دهد. انتخاب‌ها حفظ شده‌اند؛ تنظیم مرورگر را بررسی کنید.");
      return;
    }
    completed = true;
    form.hidden = true;
    app!.querySelector(".booking-steps")!.setAttribute("hidden", "");
    const result = app!.querySelector<HTMLElement>("[data-book-success]")!;
    result.hidden = false;
    result.querySelector("h2")!.textContent = previous
      ? "زمان نوبت نمایشی تغییر کرد."
      : "نوبت نمایشی آماده شد.";
    result.querySelector("[data-book-success-details]")!.textContent =
      `${doctorName(doctor)} · ${persianDate(date)} · ${persianTime(time)}`;
    result.querySelector("[data-book-success-code]")!.textContent = record.id;
    result.focus();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === appointmentKey && !completed) {
      if (
        date &&
        time &&
        !availableSlots(doctor, date, previous?.id).includes(time)
      ) {
        time = "";
        if (step > 2) showStep(2);
        else calendar();
        feedback("زمان انتخاب‌شده دیگر آزاد نیست؛ انتخاب دیگری انجام دهید.");
        summary();
      }
    }
  });
  if (reschedule && !previous)
    status.textContent =
      "نوبت قابل تغییر پیدا نشد؛ می‌توانید نوبت جدیدی انتخاب کنید.";
  showStep(step, false, false);
}
const appointmentPage = document.querySelector<HTMLElement>(
  "[data-appointment-page]",
);
if (appointmentPage) {
  let filter = "active",
    cancelId = "";
  const list = appointmentPage.querySelector<HTMLElement>(
    "[data-appointment-list]",
  )!;
  const status = appointmentPage.querySelector<HTMLElement>(
    "[data-appointment-status]",
  )!;
  const dialog = document.querySelector<HTMLDialogElement>(
    "[data-cancel-dialog]",
  )!;
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) render();
  });
  function render() {
    const rows = readAppointments()
      .filter(
        (a) => filter === "all" || (a.status === "booked" && isUpcoming(a)),
      )
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    list.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "d-empty";
      empty.textContent =
        filter === "active"
          ? "نوبت فعال ندارید. برای امتحان مسیر، یک نوبت نمایشی انتخاب کنید."
          : "هنوز نوبت نمایشی ذخیره نشده است.";
      list.append(empty);
    }
    for (const a of rows) {
      const card = document.createElement("article");
      card.className = "appointment-card";
      card.dataset.appointment = a.id;
      const info = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = doctorName(a.doctor);
      const time = document.createElement("p");
      time.textContent = `${persianDate(a.date)} · ${persianTime(a.time)} · به وقت تهران`;
      const code = document.createElement("p");
      code.textContent = `${a.id} · ${a.status === "cancelled" ? "لغوشده" : isUpcoming(a) ? "نوبت نمایشی فعال" : "زمان گذشته"}`;
      info.append(title, time, code);
      const actions = document.createElement("div");
      actions.className = "d-actions";
      if (a.status === "booked" && isUpcoming(a)) {
        const change = document.createElement("a");
        change.className = "d-button secondary";
        const url = new URL(appointmentPage!.dataset.bookUrl!, location.href);
        url.searchParams.set("reschedule", a.id);
        change.href = url.href;
        change.textContent = "تغییر زمان";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "d-button secondary";
        cancel.dataset.cancelAppointment = a.id;
        cancel.textContent = "لغو نوبت";
        cancel.onclick = () => {
          cancelId = a.id;
          dialog.querySelector("[data-cancel-details]")!.textContent =
            `${doctorName(a.doctor)} · ${persianDate(a.date, "short")} · ${persianTime(a.time)}`;
          dialog.showModal();
        };
        actions.append(change, cancel);
      }
      card.append(info, actions);
      list.append(card);
    }
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-appointment-filter]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.appointmentFilter!;
        document
          .querySelectorAll("[data-appointment-filter]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        render();
      }),
    );
  dialog
    .querySelectorAll("[data-cancel-close]")
    .forEach((b) => b.addEventListener("click", () => dialog.close()));
  dialog
    .querySelector("[data-cancel-confirm]")
    ?.addEventListener("click", () => {
      const rows = readAppointments();
      const a = rows.find((a) => a.id === cancelId);
      if (!a) {
        dialog.close();
        render();
        status.textContent = "نوبت پیدا نشد؛ فهرست به‌روز شد.";
        return;
      }
      a.status = "cancelled";
      if (!writeAppointments(rows)) {
        dialog.querySelector("[data-cancel-details]")!.textContent =
          "لغو ذخیره نشد؛ مرورگر ذخیره‌سازی را اجازه نمی‌دهد.";
        return;
      }
      dialog.close();
      render();
      status.textContent = "نوبت نمایشی لغو شد و زمان آن دوباره آزاد است.";
      appointmentPage!
        .querySelector<HTMLButtonElement>("[data-appointment-filter]")
        ?.focus({ preventScroll: true });
    });
  window.addEventListener("storage", (event) => {
    if (event.key === appointmentKey) render();
  });
  render();
}
window.addEventListener("storage", (event) => {
  if (event.key === appointmentKey) updateNearest();
});
