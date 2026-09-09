// In-memory data store replicating Django Models & seed_demo data

const STAGES = {
  NEW_LEAD: "new_lead",
  NEGOTIATION: "negotiation",
  CLOSED_WON: "closed_won",
  CLOSED_LOST: "closed_lost",
};

const STAGE_LABELS = {
  new_lead: "Нов лийд",
  negotiation: "Преговори",
  closed_won: "Затворена — спечелена",
  closed_lost: "Затворена — загубена",
};

const DEFAULT_PROBABILITY = {
  new_lead: 20,
  negotiation: 55,
  closed_won: 100,
  closed_lost: 0,
};

const TASK_KINDS = {
  call: "Обаждане",
  meeting: "Среща",
  follow_up: "Последващо действие",
  other: "Друго",
};

const COMM_KINDS = {
  call: "Обаждане",
  email: "Имейл",
  meeting: "Среща",
  note: "Бележка",
};

const ROLES = {
  admin: "Администратор",
  sales_rep: "Търговски представител",
};

function daysFromNow(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d;
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function formatDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function formatDisplayDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("bg-BG", { year: "numeric", month: "short", day: "numeric" });
}

function formatDisplayDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("bg-BG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("bg-BG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export class Store {
  constructor() {
    this.users = [
      {
        id: 1,
        username: "admin",
        password: "Admin12345",
        firstName: "Админ",
        lastName: "Системов",
        email: "admin@crm.local",
        role: "admin",
        isSuperuser: true,
        phone: "+359 2 987 654",
      },
      {
        id: 2,
        username: "ivan",
        password: "Demo12345",
        firstName: "Иван",
        lastName: "Петров",
        email: "ivan@crm.local",
        role: "sales_rep",
        isSuperuser: false,
        phone: "+359 88 765 4321",
      },
      {
        id: 3,
        username: "maria",
        password: "Demo12345",
        firstName: "Мария",
        lastName: "Иванова",
        email: "maria@crm.local",
        role: "sales_rep",
        isSuperuser: false,
        phone: "+359 88 876 5432",
      },
    ];

    this.companies = [
      {
        id: 1,
        name: "Аксес Софт ООД",
        industry: "IT услуги",
        ownerId: 2,
        website: "https://access-soft.example",
        address: "София",
        notes: "Водещ доставчик на софтуерни решения.",
        createdAt: daysFromNow(-40),
      },
      {
        id: 2,
        name: "Ривиера Хотели",
        industry: "Туризъм",
        ownerId: 2,
        website: "",
        address: "Варна",
        notes: "Хотелска верига по Черноморието.",
        createdAt: daysFromNow(-35),
      },
      {
        id: 3,
        name: "Нова Логистика АД",
        industry: "Логистика",
        ownerId: 3,
        website: "https://nova-log.example",
        address: "Пловдив",
        notes: "Транспорт и складова база.",
        createdAt: daysFromNow(-30),
      },
      {
        id: 4,
        name: "Грийн Енерджи ЕООД",
        industry: "Енергетика",
        ownerId: 3,
        website: "",
        address: "Бургас",
        notes: "ВЕИ проекти и фотоволтаици.",
        createdAt: daysFromNow(-25),
      },
    ];

    this.contacts = [
      {
        id: 1,
        firstName: "Георги",
        lastName: "Стоянов",
        email: "georgi@access.example",
        phone: "+359 88 123 4567",
        position: "Мениджър покупки",
        companyId: 1,
        ownerId: 2,
        notes: "Предпочита обаждания сутрин.",
        createdAt: daysFromNow(-38),
      },
      {
        id: 2,
        firstName: "Елена",
        lastName: "Колева",
        email: "elena@riviera.example",
        phone: "+359 88 234 5678",
        position: "Директор",
        companyId: 2,
        ownerId: 2,
        notes: "Търси интеграция със съществуващ софтуер.",
        createdAt: daysFromNow(-33),
      },
      {
        id: 3,
        firstName: "Николай",
        lastName: "Димитров",
        email: "nikolay@nova.example",
        phone: "+359 88 345 6789",
        position: "Изпълнителен директор",
        companyId: 3,
        ownerId: 3,
        notes: "Ключов клиент за логистика.",
        createdAt: daysFromNow(-28),
      },
      {
        id: 4,
        firstName: "Петя",
        lastName: "Атанасова",
        email: "petya@green.example",
        phone: "+359 88 456 7890",
        position: "Търговски директор",
        companyId: 4,
        ownerId: 3,
        notes: "Интерес към енергийна автоматизация.",
        createdAt: daysFromNow(-20),
      },
    ];

    this.deals = [
      {
        id: 1,
        title: "Лицензи ERP",
        contactId: 1,
        companyId: 1,
        ownerId: 2,
        stage: STAGES.NEW_LEAD,
        value: 18000,
        probability: 20,
        expectedCloseDate: formatDate(daysFromNow(25)),
        closedAt: null,
        notes: "В процес на съгласуване на брой потребители.",
        createdAt: daysFromNow(-15),
        updatedAt: daysFromNow(-2),
      },
      {
        id: 2,
        title: "CRM внедряване",
        contactId: 2,
        companyId: 2,
        ownerId: 2,
        stage: STAGES.NEGOTIATION,
        value: 42000,
        probability: 60,
        expectedCloseDate: formatDate(daysFromNow(12)),
        closedAt: null,
        notes: "Финално уточняване на SLA условията.",
        createdAt: daysFromNow(-20),
        updatedAt: daysFromNow(-1),
      },
      {
        id: 3,
        title: "Годишен договор хостинг",
        contactId: 1,
        companyId: 1,
        ownerId: 2,
        stage: STAGES.CLOSED_WON,
        value: 9600,
        probability: 100,
        expectedCloseDate: formatDate(daysFromNow(-8)),
        closedAt: formatDate(daysFromNow(-6)),
        notes: "Подписан договор за 12 месеца.",
        createdAt: daysFromNow(-25),
        updatedAt: daysFromNow(-6),
      },
      {
        id: 4,
        title: "WMS система",
        contactId: 3,
        companyId: 3,
        ownerId: 3,
        stage: STAGES.NEGOTIATION,
        value: 75000,
        probability: 50,
        expectedCloseDate: formatDate(daysFromNow(20)),
        closedAt: null,
        notes: "Очаква се одобрение от Борда.",
        createdAt: daysFromNow(-18),
        updatedAt: daysFromNow(-1),
      },
      {
        id: 5,
        title: "Соларно офериране",
        contactId: 4,
        companyId: 4,
        ownerId: 3,
        stage: STAGES.NEW_LEAD,
        value: 31000,
        probability: 20,
        expectedCloseDate: formatDate(daysFromNow(40)),
        closedAt: null,
        notes: "Първоначално техническо запитване.",
        createdAt: daysFromNow(-8),
        updatedAt: daysFromNow(-8),
      },
      {
        id: 6,
        title: "Складова автоматизация",
        contactId: 3,
        companyId: 3,
        ownerId: 3,
        stage: STAGES.CLOSED_LOST,
        value: 22000,
        probability: 0,
        expectedCloseDate: formatDate(daysFromNow(-3)),
        closedAt: formatDate(daysFromNow(-2)),
        notes: "Клиентът отложи бюджета за догодина.",
        createdAt: daysFromNow(-22),
        updatedAt: daysFromNow(-2),
      },
      {
        id: 7,
        title: "Поддръжка 2026",
        contactId: 2,
        companyId: 2,
        ownerId: 2,
        stage: STAGES.CLOSED_WON,
        value: 15400,
        probability: 100,
        expectedCloseDate: formatDate(daysFromNow(-20)),
        closedAt: formatDate(daysFromNow(-18)),
        notes: "Успешно продължен сервизен план.",
        createdAt: daysFromNow(-30),
        updatedAt: daysFromNow(-18),
      },
    ];

    this.dealStageHistory = [
      { id: 1, dealId: 1, fromStage: "", toStage: STAGES.NEW_LEAD, changedById: 2, changedAt: daysFromNow(-15) },
      { id: 2, dealId: 2, fromStage: "", toStage: STAGES.NEW_LEAD, changedById: 2, changedAt: daysFromNow(-20) },
      { id: 3, dealId: 2, fromStage: STAGES.NEW_LEAD, toStage: STAGES.NEGOTIATION, changedById: 2, changedAt: daysFromNow(-10) },
      { id: 4, dealId: 3, fromStage: "", toStage: STAGES.NEW_LEAD, changedById: 2, changedAt: daysFromNow(-25) },
      { id: 5, dealId: 3, fromStage: STAGES.NEW_LEAD, toStage: STAGES.NEGOTIATION, changedById: 2, changedAt: daysFromNow(-14) },
      { id: 6, dealId: 3, fromStage: STAGES.NEGOTIATION, toStage: STAGES.CLOSED_WON, changedById: 2, changedAt: daysFromNow(-6) },
      { id: 7, dealId: 4, fromStage: "", toStage: STAGES.NEW_LEAD, changedById: 3, changedAt: daysFromNow(-18) },
      { id: 8, dealId: 4, fromStage: STAGES.NEW_LEAD, toStage: STAGES.NEGOTIATION, changedById: 3, changedAt: daysFromNow(-8) },
      { id: 9, dealId: 5, fromStage: "", toStage: STAGES.NEW_LEAD, changedById: 3, changedAt: daysFromNow(-8) },
      { id: 10, dealId: 6, fromStage: "", toStage: STAGES.NEW_LEAD, changedById: 3, changedAt: daysFromNow(-22) },
      { id: 11, dealId: 6, fromStage: STAGES.NEW_LEAD, toStage: STAGES.CLOSED_LOST, changedById: 3, changedAt: daysFromNow(-2) },
      { id: 12, dealId: 7, fromStage: "", toStage: STAGES.NEW_LEAD, changedById: 2, changedAt: daysFromNow(-30) },
      { id: 13, dealId: 7, fromStage: STAGES.NEW_LEAD, toStage: STAGES.CLOSED_WON, changedById: 2, changedAt: daysFromNow(-18) },
    ];

    this.communications = [
      {
        id: 1,
        contactId: 1,
        kind: "call",
        subject: "Първи разговор",
        body: "Обсъдихме нужда от ERP модули.",
        occurredAt: daysFromNow(-4),
        createdById: 2,
        createdAt: daysFromNow(-4),
      },
      {
        id: 2,
        contactId: 2,
        kind: "meeting",
        subject: "Демо на продукта",
        body: "Показахме pipeline и отчети.",
        occurredAt: daysFromNow(-2),
        createdById: 2,
        createdAt: daysFromNow(-2),
      },
      {
        id: 3,
        contactId: 3,
        kind: "email",
        subject: "Оферта WMS",
        body: "Изпратена оферта с 3 пакета.",
        occurredAt: daysFromNow(-1),
        createdById: 3,
        createdAt: daysFromNow(-1),
      },
      {
        id: 4,
        contactId: 4,
        kind: "note",
        subject: "Лид от изложение",
        body: "Срещнахме се на Green Expo.",
        occurredAt: daysFromNow(0, -8),
        createdById: 3,
        createdAt: daysFromNow(0, -8),
      },
    ];

    this.tasks = [
      {
        id: 1,
        title: "Обаждане към Георги",
        kind: "call",
        dueAt: daysFromNow(1, 2),
        reminderAt: daysFromNow(1, 0),
        ownerId: 2,
        contactId: 1,
        dealId: 1,
        description: "Уточняване на датата за подписване.",
        completed: false,
        createdAt: daysFromNow(-2),
      },
      {
        id: 2,
        title: "Среща в Ривиера",
        kind: "meeting",
        dueAt: daysFromNow(3, 4),
        reminderAt: daysFromNow(3, 2),
        ownerId: 2,
        contactId: 2,
        dealId: 2,
        description: "Финално съгласуване на договора.",
        completed: false,
        createdAt: daysFromNow(-3),
      },
      {
        id: 3,
        title: "Последващ имейл за WMS",
        kind: "follow_up",
        dueAt: daysFromNow(0, 6),
        reminderAt: daysFromNow(0, 4),
        ownerId: 3,
        contactId: 3,
        dealId: 4,
        description: "Проверка дали офертата е стигнала до Борда.",
        completed: false,
        createdAt: daysFromNow(-1),
      },
      {
        id: 4,
        title: "Презентация Green Energy",
        kind: "meeting",
        dueAt: daysFromNow(5, 0),
        reminderAt: daysFromNow(5, -2),
        ownerId: 3,
        contactId: 4,
        dealId: 5,
        description: "Презентиране на соларния софтуер.",
        completed: false,
        createdAt: daysFromNow(-1),
      },
      {
        id: 5,
        title: "Просрочено напомняне",
        kind: "call",
        dueAt: daysFromNow(-1, 0),
        reminderAt: daysFromNow(-1, -2),
        ownerId: 2,
        contactId: 1,
        dealId: 1,
        description: "Спешно обаждане за проверка на бюджета.",
        completed: false,
        createdAt: daysFromNow(-3),
      },
    ];

    this.nextId = {
      users: 10,
      companies: 10,
      contacts: 10,
      deals: 10,
      dealStageHistory: 20,
      communications: 10,
      tasks: 10,
    };
  }

  getUser(id) {
    return this.users.find((u) => u.id === Number(id)) || null;
  }

  getUserByUsername(username) {
    if (!username) return null;
    const clean = String(username).trim().toLowerCase();
    if (clean === "админ" || clean === "admin") {
      return this.users.find((u) => u.username === "admin") || null;
    }
    if (clean === "иван" || clean === "ivan") {
      return this.users.find((u) => u.username === "ivan") || null;
    }
    if (clean === "мария" || clean === "maria") {
      return this.users.find((u) => u.username === "maria") || null;
    }
    return (
      this.users.find(
        (u) =>
          u.username.toLowerCase() === clean ||
          (u.email && u.email.toLowerCase() === clean) ||
          (u.firstName && u.firstName.toLowerCase() === clean)
      ) || null
    );
  }

  getUserFullName(u) {
    if (!u) return "";
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return name || u.username;
  }

  isAdmin(user) {
    return Boolean(user && (user.role === "admin" || user.isSuperuser));
  }

  // Scoped queries
  getScopedCompanies(user) {
    if (!user) return [];
    if (this.isAdmin(user)) return this.companies;
    return this.companies.filter((c) => c.ownerId === user.id);
  }

  getScopedContacts(user) {
    if (!user) return [];
    if (this.isAdmin(user)) return this.contacts;
    return this.contacts.filter((c) => c.ownerId === user.id);
  }

  getScopedDeals(user) {
    if (!user) return [];
    if (this.isAdmin(user)) return this.deals;
    return this.deals.filter((d) => d.ownerId === user.id);
  }

  getScopedTasks(user) {
    if (!user) return [];
    if (this.isAdmin(user)) return this.tasks;
    return this.tasks.filter((t) => t.ownerId === user.id);
  }

  // Hydration helpers
  hydrateContact(c) {
    if (!c) return null;
    const company = this.companies.find((comp) => comp.id === c.companyId) || null;
    const owner = this.users.find((u) => u.id === c.ownerId) || null;
    const comms = this.communications
      .filter((m) => m.contactId === c.id)
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
      .map((m) => ({
        ...m,
        kindLabel: COMM_KINDS[m.kind] || m.kind,
        displayDate: formatDisplayDateTime(m.occurredAt),
        createdBy: this.users.find((u) => u.id === m.createdById),
      }));
    const deals = this.deals
      .filter((d) => d.contactId === c.id)
      .map((d) => this.hydrateDeal(d));
    const tasks = this.tasks.filter((t) => t.contactId === c.id);

    return {
      ...c,
      fullName: `${c.firstName} ${c.lastName}`.trim(),
      company,
      owner,
      ownerName: this.getUserFullName(owner),
      communications: comms,
      deals,
      tasks,
    };
  }

  hydrateCompany(comp) {
    if (!comp) return null;
    const owner = this.users.find((u) => u.id === comp.ownerId) || null;
    const contacts = this.contacts
      .filter((c) => c.companyId === comp.id)
      .map((c) => ({
        ...c,
        fullName: `${c.firstName} ${c.lastName}`.trim(),
      }));
    const deals = this.deals.filter((d) => d.companyId === comp.id);
    return {
      ...comp,
      owner,
      ownerName: this.getUserFullName(owner),
      contacts,
      deals,
    };
  }

  hydrateDeal(d) {
    if (!d) return null;
    const contact = this.contacts.find((c) => c.id === d.contactId) || null;
    const company = this.companies.find((c) => c.id === d.companyId) || null;
    const owner = this.users.find((u) => u.id === d.ownerId) || null;
    const weightedValue = (Number(d.value || 0) * Number(d.probability || 0)) / 100;
    const history = this.dealStageHistory
      .filter((h) => h.dealId === d.id)
      .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
      .map((h) => ({
        ...h,
        displayDate: formatDisplayDateTime(h.changedAt),
        changedBy: this.users.find((u) => u.id === h.changedById),
        fromLabel: STAGE_LABELS[h.fromStage] || h.fromStage || "Начало",
        toLabel: STAGE_LABELS[h.toStage] || h.toStage,
      }));
    const tasks = this.tasks
      .filter((t) => t.dealId === d.id)
      .map((t) => this.hydrateTask(t));

    return {
      ...d,
      stageLabel: STAGE_LABELS[d.stage] || d.stage,
      contact: contact ? { ...contact, fullName: `${contact.firstName} ${contact.lastName}`.trim() } : null,
      company,
      owner,
      ownerName: this.getUserFullName(owner),
      weightedValue,
      history,
      tasks,
      displayExpectedDate: formatDisplayDate(d.expectedCloseDate),
      displayClosedAt: formatDisplayDate(d.closedAt),
    };
  }

  hydrateTask(t) {
    if (!t) return null;
    const contact = this.contacts.find((c) => c.id === t.contactId) || null;
    const deal = this.deals.find((d) => d.id === t.dealId) || null;
    const owner = this.users.find((u) => u.id === t.ownerId) || null;
    const isOverdue = !t.completed && new Date(t.dueAt) < new Date();

    return {
      ...t,
      kindLabel: TASK_KINDS[t.kind] || t.kind,
      displayDue: formatDisplayDateTime(t.dueAt),
      displayReminder: formatDisplayDateTime(t.reminderAt),
      contact: contact ? { ...contact, fullName: `${contact.firstName} ${contact.lastName}`.trim() } : null,
      deal,
      owner,
      ownerName: this.getUserFullName(owner),
      isOverdue,
    };
  }

  // Mutators
  addCompany(data, user) {
    const ownerId = this.isAdmin(user) ? Number(data.ownerId || user.id) : user.id;
    const obj = {
      id: this.nextId.companies++,
      name: String(data.name || "").trim(),
      industry: String(data.industry || "").trim(),
      website: String(data.website || "").trim(),
      address: String(data.address || "").trim(),
      notes: String(data.notes || "").trim(),
      ownerId,
      createdAt: new Date(),
    };
    this.companies.push(obj);
    return obj;
  }

  updateCompany(id, data, user) {
    const comp = this.companies.find((c) => c.id === Number(id));
    if (!comp) return null;
    if (!this.isAdmin(user) && comp.ownerId !== user.id) {
      throw new Error("Нямате права за редакция на тази компания.");
    }
    comp.name = String(data.name || "").trim();
    comp.industry = String(data.industry || "").trim();
    comp.website = String(data.website || "").trim();
    comp.address = String(data.address || "").trim();
    comp.notes = String(data.notes || "").trim();
    if (this.isAdmin(user) && data.ownerId) {
      comp.ownerId = Number(data.ownerId);
    }
    return comp;
  }

  addContact(data, user) {
    const ownerId = this.isAdmin(user) ? Number(data.ownerId || user.id) : user.id;
    const obj = {
      id: this.nextId.contacts++,
      firstName: String(data.firstName || "").trim(),
      lastName: String(data.lastName || "").trim(),
      email: String(data.email || "").trim(),
      phone: String(data.phone || "").trim(),
      position: String(data.position || "").trim(),
      companyId: Number(data.companyId),
      ownerId,
      notes: String(data.notes || "").trim(),
      createdAt: new Date(),
    };
    this.contacts.push(obj);
    return obj;
  }

  updateContact(id, data, user) {
    const contact = this.contacts.find((c) => c.id === Number(id));
    if (!contact) return null;
    if (!this.isAdmin(user) && contact.ownerId !== user.id) {
      throw new Error("Нямате права за редакция на този контакт.");
    }
    contact.firstName = String(data.firstName || "").trim();
    contact.lastName = String(data.lastName || "").trim();
    contact.email = String(data.email || "").trim();
    contact.phone = String(data.phone || "").trim();
    contact.position = String(data.position || "").trim();
    contact.companyId = Number(data.companyId);
    contact.notes = String(data.notes || "").trim();
    if (this.isAdmin(user) && data.ownerId) {
      contact.ownerId = Number(data.ownerId);
    }
    return contact;
  }

  addCommunication(contactId, data, user) {
    const contact = this.contacts.find((c) => c.id === Number(contactId));
    if (!contact) return null;
    const obj = {
      id: this.nextId.communications++,
      contactId: contact.id,
      kind: data.kind || "note",
      subject: String(data.subject || "").trim(),
      body: String(data.body || "").trim(),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      createdById: user.id,
      createdAt: new Date(),
    };
    this.communications.push(obj);
    return obj;
  }

  addDeal(data, user) {
    const ownerId = this.isAdmin(user) ? Number(data.ownerId || user.id) : user.id;
    const contact = this.contacts.find((c) => c.id === Number(data.contactId));
    if (!contact) throw new Error("Моля, изберете валиден контакт.");

    const stage = data.stage || STAGES.NEW_LEAD;
    let probability = data.probability !== undefined && data.probability !== ""
      ? Number(data.probability)
      : DEFAULT_PROBABILITY[stage];

    let closedAt = null;
    if (stage === STAGES.CLOSED_WON) {
      probability = 100;
      closedAt = data.closedAt ? formatDate(data.closedAt) : formatDate(new Date());
    } else if (stage === STAGES.CLOSED_LOST) {
      probability = 0;
      closedAt = data.closedAt ? formatDate(data.closedAt) : formatDate(new Date());
    }

    const obj = {
      id: this.nextId.deals++,
      title: String(data.title || "").trim(),
      contactId: contact.id,
      companyId: contact.companyId,
      ownerId,
      stage,
      value: Number(data.value || 0),
      probability,
      expectedCloseDate: formatDate(data.expectedCloseDate) || formatDate(daysFromNow(30)),
      closedAt,
      notes: String(data.notes || "").trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.deals.push(obj);
    this.dealStageHistory.push({
      id: this.nextId.dealStageHistory++,
      dealId: obj.id,
      fromStage: "",
      toStage: obj.stage,
      changedById: user.id,
      changedAt: new Date(),
    });

    return obj;
  }

  updateDeal(id, data, user) {
    const deal = this.deals.find((d) => d.id === Number(id));
    if (!deal) return null;
    if (!this.isAdmin(user) && deal.ownerId !== user.id) {
      throw new Error("Нямате права за редакция на тази сделка.");
    }

    const previousStage = deal.stage;
    const newStage = data.stage || deal.stage;

    const contact = this.contacts.find((c) => c.id === Number(data.contactId || deal.contactId));
    if (contact) {
      deal.contactId = contact.id;
      deal.companyId = contact.companyId;
    }

    deal.title = String(data.title || deal.title).trim();
    deal.value = Number(data.value || deal.value);
    deal.notes = String(data.notes !== undefined ? data.notes : deal.notes).trim();
    deal.expectedCloseDate = formatDate(data.expectedCloseDate || deal.expectedCloseDate);

    if (this.isAdmin(user) && data.ownerId) {
      deal.ownerId = Number(data.ownerId);
    }

    deal.stage = newStage;
    if (newStage === STAGES.CLOSED_WON) {
      deal.probability = 100;
      deal.closedAt = data.closedAt ? formatDate(data.closedAt) : formatDate(new Date());
    } else if (newStage === STAGES.CLOSED_LOST) {
      deal.probability = 0;
      deal.closedAt = data.closedAt ? formatDate(data.closedAt) : formatDate(new Date());
    } else {
      deal.closedAt = null;
      if (previousStage !== newStage) {
        deal.probability = DEFAULT_PROBABILITY[newStage];
      } else if (data.probability !== undefined && data.probability !== "") {
        deal.probability = Number(data.probability);
      }
    }

    deal.updatedAt = new Date();

    if (previousStage !== newStage) {
      this.dealStageHistory.push({
        id: this.nextId.dealStageHistory++,
        dealId: deal.id,
        fromStage: previousStage,
        toStage: newStage,
        changedById: user.id,
        changedAt: new Date(),
      });
    }

    return deal;
  }

  setDealStage(id, newStage, user) {
    const deal = this.deals.find((d) => d.id === Number(id));
    if (!deal) return null;
    if (!this.isAdmin(user) && deal.ownerId !== user.id) {
      throw new Error("Нямате права да променяте етапа на тази сделка.");
    }
    const previousStage = deal.stage;
    if (previousStage === newStage) return deal;

    deal.stage = newStage;
    if (newStage === STAGES.CLOSED_WON) {
      deal.probability = 100;
      deal.closedAt = formatDate(new Date());
    } else if (newStage === STAGES.CLOSED_LOST) {
      deal.probability = 0;
      deal.closedAt = formatDate(new Date());
    } else {
      deal.closedAt = null;
      deal.probability = DEFAULT_PROBABILITY[newStage];
    }

    deal.updatedAt = new Date();

    this.dealStageHistory.push({
      id: this.nextId.dealStageHistory++,
      dealId: deal.id,
      fromStage: previousStage,
      toStage: newStage,
      changedById: user.id,
      changedAt: new Date(),
    });

    return deal;
  }

  addTask(data, user) {
    const ownerId = this.isAdmin(user) ? Number(data.ownerId || user.id) : user.id;
    let contactId = data.contactId ? Number(data.contactId) : null;
    const dealId = data.dealId ? Number(data.dealId) : null;

    if (dealId && !contactId) {
      const deal = this.deals.find((d) => d.id === dealId);
      if (deal) contactId = deal.contactId;
    }

    if (!contactId && !dealId) {
      throw new Error("Задачата трябва да е свързана с контакт или сделка.");
    }

    const dueAt = data.dueAt ? new Date(data.dueAt) : daysFromNow(1);
    const reminderAt = data.reminderAt ? new Date(data.reminderAt) : null;

    if (reminderAt && reminderAt > dueAt) {
      throw new Error("Напомнянето не може да е след срока.");
    }

    const obj = {
      id: this.nextId.tasks++,
      title: String(data.title || "").trim(),
      kind: data.kind || "follow_up",
      description: String(data.description || "").trim(),
      dueAt,
      reminderAt,
      completed: Boolean(data.completed),
      contactId,
      dealId,
      ownerId,
      createdAt: new Date(),
    };
    this.tasks.push(obj);
    return obj;
  }

  updateTask(id, data, user) {
    const task = this.tasks.find((t) => t.id === Number(id));
    if (!task) return null;
    if (!this.isAdmin(user) && task.ownerId !== user.id) {
      throw new Error("Нямате права за редакция на тази задача.");
    }

    let contactId = data.contactId ? Number(data.contactId) : null;
    const dealId = data.dealId ? Number(data.dealId) : null;

    if (dealId && !contactId) {
      const deal = this.deals.find((d) => d.id === dealId);
      if (deal) contactId = deal.contactId;
    }

    if (!contactId && !dealId) {
      throw new Error("Задачата трябва да е свързана с контакт или сделка.");
    }

    const dueAt = data.dueAt ? new Date(data.dueAt) : task.dueAt;
    const reminderAt = data.reminderAt ? new Date(data.reminderAt) : null;

    if (reminderAt && reminderAt > dueAt) {
      throw new Error("Напомнянето не може да е след срока.");
    }

    task.title = String(data.title || task.title).trim();
    task.kind = data.kind || task.kind;
    task.description = String(data.description !== undefined ? data.description : task.description).trim();
    task.dueAt = dueAt;
    task.reminderAt = reminderAt;
    task.completed = data.completed !== undefined ? Boolean(data.completed) : task.completed;
    task.contactId = contactId;
    task.dealId = dealId;

    if (this.isAdmin(user) && data.ownerId) {
      task.ownerId = Number(data.ownerId);
    }

    return task;
  }

  completeTask(id, user) {
    const task = this.tasks.find((t) => t.id === Number(id));
    if (!task) return null;
    if (!this.isAdmin(user) && task.ownerId !== user.id) {
      throw new Error("Нямате права да завършите тази задача.");
    }
    task.completed = true;
    return task;
  }

  addUser(data, user) {
    if (!this.isAdmin(user)) {
      throw new Error("Само администратор може да създава потребители.");
    }
    if (this.getUserByUsername(data.username)) {
      throw new Error("Потребител с това потребителско име вече съществува.");
    }
    const obj = {
      id: this.nextId.users++,
      username: String(data.username || "").trim(),
      password: String(data.password || "Demo12345"),
      firstName: String(data.firstName || "").trim(),
      lastName: String(data.lastName || "").trim(),
      email: String(data.email || "").trim(),
      role: data.role === "admin" ? "admin" : "sales_rep",
      isSuperuser: data.role === "admin",
      phone: String(data.phone || "").trim(),
    };
    this.users.push(obj);
    return obj;
  }
}

export const store = new Store();
export {
  STAGES,
  STAGE_LABELS,
  DEFAULT_PROBABILITY,
  TASK_KINDS,
  COMM_KINDS,
  ROLES,
  formatDate,
  formatDateTime,
  formatDisplayDate,
  formatDisplayDateTime,
  formatNumber,
};
