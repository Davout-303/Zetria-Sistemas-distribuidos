document.addEventListener("DOMContentLoaded", function () {
  const currentMonthEl = document.getElementById("current-month");
  const calendarDays = document.getElementById("calendar-days");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const todayBtn = document.getElementById("today-button");

  const modalOverlay = document.getElementById("modal-overlay");
  const closeModalBtn = document.getElementById("close-modal");
  const modalDate = document.getElementById("modal-date");
  const eventsList = document.getElementById("events-list");
  const eventInput = document.getElementById("event-input");
  const addEventBtn = document.getElementById("add-event-btn");

  let dataAtual = new Date();
  let dataSelect = null;
  let events = JSON.parse(localStorage.getItem("calendarioEventos")) || {};
  let rowsNeeded = 5;

  function renderCalendar() {
    const firstDay = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);

    const lastDay = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth() + 1,
      0
    );

    const prevLastDay = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth(),
      0
    );

    const monthDays = lastDay.getDate();
    const prevMonthDays = prevLastDay.getDate();
    const firstDayIndex = firstDay.getDay();
    const lastDayIndex = lastDay.getDay();

    const months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    currentMonthEl.textContent = `${
      months[dataAtual.getMonth()]
    } ${dataAtual.getFullYear()}`;

    let days = "";

    for (let i = firstDayIndex; i > 0; i--) {
      days += `<div class="day other-month">${prevMonthDays - i + 1}</div>`;
    }

    const today = new Date();
    for (let i = 1; i <= monthDays; i++) {
      const dateKey = `${dataAtual.getFullYear()}-${String(
        dataAtual.getMonth() + 1
      ).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const dayEvents = events[dateKey] || [];
      const isToday =
        i === today.getDate() &&
        dataAtual.getMonth() === today.getMonth() &&
        dataAtual.getFullYear() === today.getFullYear();

      let eventAbbreviations = "";
      if (dayEvents.length > 0) {
        eventAbbreviations = '<div class="event-abbreviations">';
        for (let j = 0; j < Math.min(3, dayEvents.length); j++) {
          const event = dayEvents[j];
          eventAbbreviations += `<div class="event-abbreviation" title="${event}">
                            ${event.substring(0, 8).toUpperCase()}
                        </div>`;
        }
        eventAbbreviations += "</div>";
      }

      days += `
                <div class="day ${isToday ? "today" : ""}">
                    <div class="day-number">${i}</div>
                    ${eventAbbreviations}
                </div>
            `;
    }

    for (let i = 1; i <= 6 - lastDayIndex; i++) {
      days += `<div class="day other-month">${i}</div>`;
    }

    const totalDays = firstDayIndex + monthDays + (6 - lastDayIndex);
    rowsNeeded = Math.ceil(totalDays / 7);

    calendarDays.innerHTML = days;

    calendarDays.style.gridTemplateRows = `repeat(${rowsNeeded}, 1fr)`;

    const dayElements = calendarDays.querySelectorAll(".day");
    if (dayElements.length > 0) {
      const dayHeight = dayElements[0].offsetHeight;
      calendarDays.style.minHeight = `${
        dayHeight * rowsNeeded + (rowsNeeded - 1) * 8
      }px`; 
    }

    setupDayClickListeners();
  }

  function getDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function showDayEvents(date) {
    const dateKey = getDateKey(date);
    const dayEvents = events[dateKey] || [];

    const options = { day: "numeric", month: "long", year: "numeric" };
    modalDate.textContent = date.toLocaleDateString("pt-BR", options);

    eventsList.innerHTML = "";
    dayEvents.forEach((event, index) => {
      const eventElement = document.createElement("div");
      eventElement.className = "event-item";
      eventElement.innerHTML = `
                <span>${event}</span>
                <button class="delete-event-btn" data-index="${index}">Excluir</button>
            `;
      eventsList.appendChild(eventElement);
    });

    document.querySelectorAll(".delete-event-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        deleteEvent(date, parseInt(this.getAttribute("data-index")));
      });
    });
  }

  function addEvent(date, eventText) {
    if (!eventText.trim()) return;

    const dateKey = getDateKey(date);
    if (!events[dateKey]) {
      events[dateKey] = [];
    }

    events[dateKey].push(eventText);
    localStorage.setItem("calendarEvents", JSON.stringify(events));
    showDayEvents(date);
    eventInput.value = "";
    renderCalendar();
  }

  function deleteEvent(date, index) {
    const dateKey = getDateKey(date);
    if (events[dateKey]) {
      events[dateKey].splice(index, 1);
      localStorage.setItem("calendarEvents", JSON.stringify(events));
      showDayEvents(date);
      renderCalendar();
    }
  }

  function setupDayClickListeners() {
    document.querySelectorAll(".day:not(.other-month)").forEach((day) => {
      day.addEventListener("click", function () {
        const dayNumber = parseInt(
          this.querySelector(".day-number").textContent
        );
        dataSelect = new Date(
          dataAtual.getFullYear(),
          dataAtual.getMonth(),
          dayNumber
        );

        showDayEvents(dataSelect);
        modalOverlay.classList.add("active");
        eventInput.focus();
      });
    });
  }

  function handleResize() {
    const dayElements = calendarDays.querySelectorAll(".day");
    if (dayElements.length > 0) {
      const dayHeight = dayElements[0].offsetHeight;
      calendarDays.style.minHeight = `${
        dayHeight * rowsNeeded + (rowsNeeded - 1) * 8
      }px`;
    }
  }

  prevMonthBtn.addEventListener("click", () => {
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    dataAtual.setMonth(dataAtual.getMonth() + 1);
    renderCalendar();
  });

  todayBtn.addEventListener("click", () => {
    dataAtual = new Date();
    renderCalendar();
  });

  closeModalBtn.addEventListener("click", () => {
    modalOverlay.classList.remove("active");
  });

  eventInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && dataSelect) {
      addEvent(dataSelect, eventInput.value);
    }
  });

  addEventBtn.addEventListener("click", () => {
    if (dataSelect) {
      addEvent(dataSelect, eventInput.value);
    }
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove("active");
    }
  });

  window.addEventListener("resize", handleResize);

  renderCalendar();
});
