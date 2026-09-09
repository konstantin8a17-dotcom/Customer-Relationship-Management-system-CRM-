import express from "express";
import cookieSession from "cookie-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  store,
  STAGES,
  STAGE_LABELS,
  TASK_KINDS,
  formatDate,
  formatDateTime,
  formatDisplayDate,
  formatDisplayDateTime,
  formatNumber,
} from "./src/store.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "static")));

app.use(
  cookieSession({
    name: "crm_session",
    keys: [process.env.SECRET_KEY || "crm-secret-salt-development-key"],
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
);

// Auth & Context Middleware
app.use((req, res, next) => {
  // If no user in session, default to admin for seamless evaluation
  if (!req.session.userId) {
    req.session.userId = 1;
  }

  const currentUser = store.getUser(req.session.userId) || store.getUser(1);
  req.currentUser = currentUser;
  res.locals.currentUser = currentUser;
  res.locals.formatNumber = formatNumber;
  res.locals.formatDisplayDate = formatDisplayDate;
  res.locals.formatDisplayDateTime = formatDisplayDateTime;

  // Flash message
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  // Due tasks count
  const scopedTasks = store.getScopedTasks(currentUser);
  const now = new Date();
  const dueCount = scopedTasks.filter((t) => !t.completed && new Date(t.dueAt) <= now).length;
  res.locals.dueTasksCount = dueCount;

  next();
});

// Require Auth Helper
function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return res.redirect("/accounts/login/");
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.currentUser || !store.isAdmin(req.currentUser)) {
    req.session.flash = { type: "danger", message: "Само администратори имат достъп до този модул." };
    return res.redirect("/");
  }
  next();
}

/* ============================================================
   AUTH & USER SWITCHING ROUTES
   ============================================================ */

app.get("/accounts/login/", (req, res) => {
  res.render("registration/login", {
    error: null,
    username: "",
  });
});

app.post("/accounts/login/", (req, res) => {
  const { username, password } = req.body;
  const user = store.getUserByUsername(username);

  if (!user || user.password !== password) {
    return res.render("registration/login", {
      error: "Невалидно потребителско име или парола.",
      username,
    });
  }

  req.session.userId = user.id;
  req.session.flash = { type: "success", message: `Добре дошли, ${store.getUserFullName(user)}!` };
  res.redirect("/");
});

app.post("/accounts/logout/", (req, res) => {
  req.session = null;
  res.redirect("/accounts/login/");
});

// Switch user for testing roles
app.get("/accounts/switch", (req, res) => {
  const targetUsername = req.query.user || "admin";
  const user = store.getUserByUsername(targetUsername);
  if (user) {
    req.session.userId = user.id;
    req.session.flash = {
      type: "info",
      message: `Превключихте профила на: ${store.getUserFullName(user)} (${user.role === "admin" ? "Администратор" : "Търговски представител"})`,
    };
  }
  const referer = req.get("Referer");
  res.redirect(referer || "/");
});

app.get("/accounts/users/", requireAuth, requireAdmin, (req, res) => {
  res.render("accounts/user_list", {
    title: "Потребители",
    activeNav: "users",
    users: store.users,
  });
});

app.get("/accounts/users/new/", requireAuth, requireAdmin, (req, res) => {
  res.render("accounts/user_form", {
    title: "Нов потребител",
    activeNav: "users",
    error: null,
  });
});

app.post("/accounts/users/new/", requireAuth, requireAdmin, (req, res) => {
  try {
    store.addUser(req.body, req.currentUser);
    req.session.flash = { type: "success", message: "Потребителят е създаден успешно." };
    res.redirect("/accounts/users/");
  } catch (err) {
    res.render("accounts/user_form", {
      title: "Нов потребител",
      activeNav: "users",
      error: err.message,
    });
  }
});

/* ============================================================
   DASHBOARD & REPORTS
   ============================================================ */

app.get("/", requireAuth, (req, res) => {
  const user = req.currentUser;
  const contacts = store.getScopedContacts(user);
  const deals = store.getScopedDeals(user);
  const tasks = store.getScopedTasks(user);

  const openDeals = deals.filter((d) => d.stage !== STAGES.CLOSED_WON && d.stage !== STAGES.CLOSED_LOST);
  const openCount = openDeals.length;
  const openValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const forecast = openDeals.reduce((sum, d) => sum + (Number(d.value || 0) * Number(d.probability || 0)) / 100, 0);

  const wonDeals = deals.filter((d) => d.stage === STAGES.CLOSED_WON);
  const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  const now = new Date();
  const dueTasks = tasks.filter((t) => !t.completed && new Date(t.dueAt) <= now).length;

  // Funnel counts
  const leadsCount = deals.filter((d) => d.stage === STAGES.NEW_LEAD).length;
  const negCount = deals.filter((d) => d.stage === STAGES.NEGOTIATION).length;
  const wonCount = wonDeals.length;

  const funnelJson = JSON.stringify({
    labels: ["Нов лийд", "Преговори", "Спечелена"],
    values: [leadsCount, negCount, wonCount],
  });

  const upcoming = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 5)
    .map((t) => store.hydrateTask(t));

  const recentDeals = deals
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 6)
    .map((d) => store.hydrateDeal(d));

  res.render("reports/dashboard", {
    title: "Табло",
    activeNav: "dashboard",
    contactCount: contacts.length,
    openCount,
    openValue,
    forecast,
    wonValue,
    dueTasks,
    funnelJson,
    upcoming,
    recentDeals,
  });
});

app.get("/reports/", requireAuth, (req, res) => {
  const user = req.currentUser;
  const deals = store.getScopedDeals(user);

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const startDateStr = req.query.from || formatDate(defaultStart);
  const endDateStr = req.query.to || formatDate(now);

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  // Filter deals by created or closed date in range
  const filteredDeals = deals.filter((d) => {
    const dDate = new Date(d.closedAt || d.createdAt);
    return dDate >= startDate && dDate <= endDate;
  });

  const closedWon = filteredDeals.filter((d) => d.stage === STAGES.CLOSED_WON);
  const closedLost = filteredDeals.filter((d) => d.stage === STAGES.CLOSED_LOST);
  const wonValue = closedWon.reduce((s, d) => s + Number(d.value || 0), 0);

  const totalClosed = closedWon.length + closedLost.length;
  const winRate = totalClosed > 0 ? (closedWon.length / totalClosed) * 100 : 0;

  // Funnel conversion rows
  const newLeadCount = filteredDeals.filter((d) => d.stage === STAGES.NEW_LEAD).length;
  const negCount = filteredDeals.filter((d) => d.stage === STAGES.NEGOTIATION).length;
  const wonCount = closedWon.length;
  const totalLeads = newLeadCount + negCount + wonCount + closedLost.length || 1;

  const conversionRows = [
    {
      label: "Нов лийд",
      count: newLeadCount,
      rate: 100,
      fromLeads: (newLeadCount / totalLeads) * 100,
    },
    {
      label: "Преговори",
      count: negCount,
      rate: newLeadCount > 0 ? (negCount / newLeadCount) * 100 : 0,
      fromLeads: (negCount / totalLeads) * 100,
    },
    {
      label: "Спечелена",
      count: wonCount,
      rate: negCount > 0 ? (wonCount / negCount) * 100 : 0,
      fromLeads: (wonCount / totalLeads) * 100,
    },
  ];

  const conversionJson = JSON.stringify({
    labels: conversionRows.map((r) => r.label),
    values: conversionRows.map((r) => r.count),
  });

  // Sales by representative
  const repMap = new Map();
  closedWon.forEach((d) => {
    const rep = store.getUser(d.ownerId);
    const name = rep ? store.getUserFullName(rep) : "Неизвестен";
    if (!repMap.has(d.ownerId)) {
      repMap.set(d.ownerId, { name, deals: 0, total: 0 });
    }
    const item = repMap.get(d.ownerId);
    item.deals++;
    item.total += Number(d.value || 0);
  });

  const byRep = Array.from(repMap.values());
  const salesJson = JSON.stringify({
    labels: byRep.map((r) => r.name),
    values: byRep.map((r) => r.total),
  });

  // Monthly breakdown
  const monthMap = new Map();
  closedWon.forEach((d) => {
    const dDate = new Date(d.closedAt || d.createdAt);
    const key = dDate.toLocaleString("bg-BG", { month: "short", year: "numeric" });
    monthMap.set(key, (monthMap.get(key) || 0) + Number(d.value || 0));
  });

  const monthlyLabels = Array.from(monthMap.keys());
  const monthlyValues = Array.from(monthMap.values());
  const monthlyJson = JSON.stringify({
    labels: monthlyLabels.length > 0 ? monthlyLabels : ["Текущ"],
    values: monthlyValues.length > 0 ? monthlyValues : [wonValue],
  });

  res.render("reports/reports", {
    title: "Отчети",
    activeNav: "reports",
    startDate: startDateStr,
    endDate: endDateStr,
    wonValue,
    winRate,
    closedWonCount: closedWon.length,
    closedLostCount: closedLost.length,
    conversionRows,
    conversionJson,
    byRep,
    salesJson,
    monthlyJson,
  });
});

/* ============================================================
   CONTACTS & COMPANIES
   ============================================================ */

app.get("/contacts/", requireAuth, (req, res) => {
  const user = req.currentUser;
  let contacts = store.getScopedContacts(user).map((c) => store.hydrateContact(c));

  const q = req.query.q ? String(req.query.q).toLowerCase().trim() : "";
  if (q) {
    contacts = contacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.name.toLowerCase().includes(q))
    );
  }

  res.render("contacts/contact_list", {
    title: "Контакти",
    activeNav: "contacts",
    contacts,
    q,
  });
});

app.get("/contacts/new/", requireAuth, (req, res) => {
  const user = req.currentUser;
  const companies = store.getScopedCompanies(user);
  const selectedCompanyId = req.query.company ? Number(req.query.company) : null;

  res.render("contacts/contact_form", {
    title: "Нов контакт",
    pageTitle: "Нов контакт",
    activeNav: "contacts",
    formAction: "/contacts/new/",
    contact: null,
    companies,
    selectedCompanyId,
    users: store.users,
    error: null,
  });
});

app.post("/contacts/new/", requireAuth, (req, res) => {
  try {
    const contact = store.addContact(req.body, req.currentUser);
    req.session.flash = { type: "success", message: `Контактът ${contact.firstName} ${contact.lastName} е добавен.` };
    res.redirect(`/contacts/${contact.id}/`);
  } catch (err) {
    const companies = store.getScopedCompanies(req.currentUser);
    res.render("contacts/contact_form", {
      title: "Нов контакт",
      pageTitle: "Нов контакт",
      activeNav: "contacts",
      formAction: "/contacts/new/",
      contact: req.body,
      companies,
      selectedCompanyId: Number(req.body.companyId),
      users: store.users,
      error: err.message,
    });
  }
});

// Companies
app.get("/contacts/companies/", requireAuth, (req, res) => {
  const user = req.currentUser;
  let companies = store.getScopedCompanies(user).map((c) => store.hydrateCompany(c));

  const q = req.query.q ? String(req.query.q).toLowerCase().trim() : "";
  if (q) {
    companies = companies.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.industry && c.industry.toLowerCase().includes(q))
    );
  }

  res.render("contacts/company_list", {
    title: "Компании",
    activeNav: "companies",
    companies,
    q,
  });
});

app.get("/contacts/companies/new/", requireAuth, (req, res) => {
  res.render("contacts/company_form", {
    title: "Нова компания",
    pageTitle: "Нова компания",
    activeNav: "companies",
    formAction: "/contacts/companies/new/",
    company: null,
    users: store.users,
    error: null,
  });
});

app.post("/contacts/companies/new/", requireAuth, (req, res) => {
  try {
    const comp = store.addCompany(req.body, req.currentUser);
    req.session.flash = { type: "success", message: `Компанията ${comp.name} е създадена.` };
    res.redirect(`/contacts/companies/${comp.id}/`);
  } catch (err) {
    res.render("contacts/company_form", {
      title: "Нова компания",
      pageTitle: "Нова компания",
      activeNav: "companies",
      formAction: "/contacts/companies/new/",
      company: req.body,
      users: store.users,
      error: err.message,
    });
  }
});

app.get("/contacts/companies/:id/", requireAuth, (req, res) => {
  const company = store.hydrateCompany(store.companies.find((c) => c.id === Number(req.params.id)));
  if (!company) return res.redirect("/contacts/companies/");

  res.render("contacts/company_detail", {
    title: company.name,
    activeNav: "companies",
    company,
  });
});

app.get("/contacts/companies/:id/edit/", requireAuth, (req, res) => {
  const company = store.companies.find((c) => c.id === Number(req.params.id));
  if (!company) return res.redirect("/contacts/companies/");

  res.render("contacts/company_form", {
    title: `Редакция: ${company.name}`,
    pageTitle: `Редакция: ${company.name}`,
    activeNav: "companies",
    formAction: `/contacts/companies/${company.id}/edit/`,
    company,
    users: store.users,
    error: null,
  });
});

app.post("/contacts/companies/:id/edit/", requireAuth, (req, res) => {
  try {
    const comp = store.updateCompany(req.params.id, req.body, req.currentUser);
    req.session.flash = { type: "success", message: "Данните за компанията са обновени." };
    res.redirect(`/contacts/companies/${comp.id}/`);
  } catch (err) {
    res.render("contacts/company_form", {
      title: "Редакция на компания",
      pageTitle: "Редакция на компания",
      activeNav: "companies",
      formAction: `/contacts/companies/${req.params.id}/edit/`,
      company: { ...req.body, id: req.params.id },
      users: store.users,
      error: err.message,
    });
  }
});

app.get("/contacts/:id/", requireAuth, (req, res) => {
  const contact = store.hydrateContact(store.contacts.find((c) => c.id === Number(req.params.id)));
  if (!contact) {
    req.session.flash = { type: "danger", message: "Контактът не е намерен." };
    return res.redirect("/contacts/");
  }

  res.render("contacts/contact_detail", {
    title: contact.fullName,
    activeNav: "contacts",
    contact,
    currentDateTime: formatDateTime(new Date()),
  });
});

app.get("/contacts/:id/edit/", requireAuth, (req, res) => {
  const contact = store.contacts.find((c) => c.id === Number(req.params.id));
  if (!contact) return res.redirect("/contacts/");

  const companies = store.getScopedCompanies(req.currentUser);
  res.render("contacts/contact_form", {
    title: `Редакция: ${contact.firstName} ${contact.lastName}`,
    pageTitle: `Редакция: ${contact.firstName} ${contact.lastName}`,
    activeNav: "contacts",
    formAction: `/contacts/${contact.id}/edit/`,
    contact,
    companies,
    selectedCompanyId: contact.companyId,
    users: store.users,
    error: null,
  });
});

app.post("/contacts/:id/edit/", requireAuth, (req, res) => {
  try {
    const contact = store.updateContact(req.params.id, req.body, req.currentUser);
    req.session.flash = { type: "success", message: "Данните за контакта са обновени." };
    res.redirect(`/contacts/${contact.id}/`);
  } catch (err) {
    const companies = store.getScopedCompanies(req.currentUser);
    res.render("contacts/contact_form", {
      title: "Редакция на контакт",
      pageTitle: "Редакция на контакт",
      activeNav: "contacts",
      formAction: `/contacts/${req.params.id}/edit/`,
      contact: { ...req.body, id: req.params.id },
      companies,
      selectedCompanyId: Number(req.body.companyId),
      users: store.users,
      error: err.message,
    });
  }
});

app.post("/contacts/:id/communication/", requireAuth, (req, res) => {
  try {
    store.addCommunication(req.params.id, req.body, req.currentUser);
    req.session.flash = { type: "success", message: "Комуникацията е записана успешно." };
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message };
  }
  res.redirect(`/contacts/${req.params.id}/`);
});

/* ============================================================
   DEALS & PIPELINE
   ============================================================ */

app.get("/deals/", requireAuth, (req, res) => {
  const user = req.currentUser;
  let deals = store.getScopedDeals(user).map((d) => store.hydrateDeal(d));

  const currentStage = req.query.stage || "";
  if (currentStage) {
    deals = deals.filter((d) => d.stage === currentStage);
  }

  const totalValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const stages = [
    { key: STAGES.NEW_LEAD, label: STAGE_LABELS.new_lead },
    { key: STAGES.NEGOTIATION, label: STAGE_LABELS.negotiation },
    { key: STAGES.CLOSED_WON, label: STAGE_LABELS.closed_won },
    { key: STAGES.CLOSED_LOST, label: STAGE_LABELS.closed_lost },
  ];

  res.render("deals/deal_list", {
    title: "Сделки",
    activeNav: "deals",
    deals,
    totalValue,
    stages,
    currentStage,
  });
});

app.get("/deals/pipeline/", requireAuth, (req, res) => {
  const user = req.currentUser;
  const allDeals = store.getScopedDeals(user).map((d) => store.hydrateDeal(d));

  const stageColumns = [
    { stage: STAGES.NEW_LEAD, label: STAGE_LABELS.new_lead },
    { stage: STAGES.NEGOTIATION, label: STAGE_LABELS.negotiation },
    { stage: STAGES.CLOSED_WON, label: STAGE_LABELS.closed_won },
  ];

  const columns = stageColumns.map((col) => {
    const colDeals = allDeals.filter((d) => d.stage === col.stage);
    const value = colDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
    return {
      ...col,
      deals: colDeals,
      value,
    };
  });

  const lostDeals = allDeals.filter((d) => d.stage === STAGES.CLOSED_LOST);

  res.render("deals/pipeline", {
    title: "Pipeline",
    activeNav: "pipeline",
    columns,
    lostDeals,
  });
});

app.get("/deals/new/", requireAuth, (req, res) => {
  const user = req.currentUser;
  const contacts = store.getScopedContacts(user).map((c) => store.hydrateContact(c));
  const selectedContactId = req.query.contact ? Number(req.query.contact) : null;
  const defaultExpectedDate = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  res.render("deals/deal_form", {
    title: "Нова сделка",
    pageTitle: "Нова сделка",
    activeNav: "deals",
    formAction: "/deals/new/",
    deal: null,
    contacts,
    selectedContactId,
    defaultExpectedDate,
    users: store.users,
    error: null,
  });
});

app.post("/deals/new/", requireAuth, (req, res) => {
  try {
    const deal = store.addDeal(req.body, req.currentUser);
    req.session.flash = { type: "success", message: `Сделката "${deal.title}" е регистрирана успешно.` };
    res.redirect(`/deals/${deal.id}/`);
  } catch (err) {
    const contacts = store.getScopedContacts(req.currentUser).map((c) => store.hydrateContact(c));
    res.render("deals/deal_form", {
      title: "Нова сделка",
      pageTitle: "Нова сделка",
      activeNav: "deals",
      formAction: "/deals/new/",
      deal: req.body,
      contacts,
      selectedContactId: Number(req.body.contactId),
      defaultExpectedDate: req.body.expectedCloseDate,
      users: store.users,
      error: err.message,
    });
  }
});

app.get("/deals/:id/", requireAuth, (req, res) => {
  const deal = store.hydrateDeal(store.deals.find((d) => d.id === Number(req.params.id)));
  if (!deal) return res.redirect("/deals/");

  res.render("deals/deal_detail", {
    title: deal.title,
    activeNav: "deals",
    deal,
  });
});

app.get("/deals/:id/edit/", requireAuth, (req, res) => {
  const deal = store.deals.find((d) => d.id === Number(req.params.id));
  if (!deal) return res.redirect("/deals/");

  const contacts = store.getScopedContacts(req.currentUser).map((c) => store.hydrateContact(c));
  res.render("deals/deal_form", {
    title: `Редакция: ${deal.title}`,
    pageTitle: `Редакция: ${deal.title}`,
    activeNav: "deals",
    formAction: `/deals/${deal.id}/edit/`,
    deal,
    contacts,
    selectedContactId: deal.contactId,
    defaultExpectedDate: deal.expectedCloseDate,
    users: store.users,
    error: null,
  });
});

app.post("/deals/:id/edit/", requireAuth, (req, res) => {
  try {
    const deal = store.updateDeal(req.params.id, req.body, req.currentUser);
    req.session.flash = { type: "success", message: "Данните за сделката са обновени." };
    res.redirect(`/deals/${deal.id}/`);
  } catch (err) {
    const contacts = store.getScopedContacts(req.currentUser).map((c) => store.hydrateContact(c));
    res.render("deals/deal_form", {
      title: "Редакция на сделка",
      pageTitle: "Редакция на сделка",
      activeNav: "deals",
      formAction: `/deals/${req.params.id}/edit/`,
      deal: { ...req.body, id: req.params.id },
      contacts,
      selectedContactId: Number(req.body.contactId),
      defaultExpectedDate: req.body.expectedCloseDate,
      users: store.users,
      error: err.message,
    });
  }
});

app.post("/deals/:id/stage/", requireAuth, (req, res) => {
  try {
    const deal = store.setDealStage(req.params.id, req.body.stage, req.currentUser);
    req.session.flash = {
      type: "success",
      message: `Етапът на "${deal.title}" е променен на "${STAGE_LABELS[deal.stage]}".`,
    };
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message };
  }
  const referer = req.get("Referer");
  res.redirect(referer || `/deals/${req.params.id}/`);
});

/* ============================================================
   TASKS & CALENDAR
   ============================================================ */

app.get("/tasks/", requireAuth, (req, res) => {
  const user = req.currentUser;
  const tasks = store
    .getScopedTasks(user)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .map((t) => store.hydrateTask(t));

  res.render("tasks/task_list", {
    title: "Задачи",
    activeNav: "tasks",
    tasks,
  });
});

app.get("/tasks/calendar/", requireAuth, (req, res) => {
  const user = req.currentUser;
  const tasks = store.getScopedTasks(user).map((t) => store.hydrateTask(t));

  const now = new Date();
  const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
  const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1; // 1-12

  const monthDate = new Date(year, month - 1, 1);
  const monthName = monthDate.toLocaleString("bg-BG", { month: "long" });

  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear--;
  }

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  // Generate calendar weeks
  const firstDayOfWeek = (monthDate.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const cells = [];

  // Previous month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      day: d,
      isCurrentMonth: false,
      isToday: false,
      tasks: [],
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dateStr = formatDate(dateObj);
    const isToday =
      d === now.getDate() && month - 1 === now.getMonth() && year === now.getFullYear();

    const dayTasks = tasks.filter((t) => formatDate(t.dueAt) === dateStr);

    cells.push({
      day: d,
      isCurrentMonth: true,
      isToday,
      tasks: dayTasks,
    });
  }

  // Next month padding to complete weeks
  const totalSlots = Math.ceil(cells.length / 7) * 7;
  let nextDay = 1;
  while (cells.length < totalSlots) {
    cells.push({
      day: nextDay++,
      isCurrentMonth: false,
      isToday: false,
      tasks: [],
    });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  res.render("tasks/calendar", {
    title: "Календар",
    activeNav: "calendar",
    year,
    month,
    monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
    prevMonth,
    prevYear,
    nextMonth,
    nextYear,
    weeks,
  });
});

app.get("/tasks/new/", requireAuth, (req, res) => {
  const user = req.currentUser;
  const contacts = store.getScopedContacts(user).map((c) => store.hydrateContact(c));
  const deals = store.getScopedDeals(user);
  const selectedContactId = req.query.contact ? Number(req.query.contact) : null;
  const selectedDealId = req.query.deal ? Number(req.query.deal) : null;

  const defaultDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const defaultReminder = new Date(Date.now() + 22 * 60 * 60 * 1000);

  res.render("tasks/task_form", {
    title: "Нова задача",
    pageTitle: "Нова задача",
    activeNav: "tasks",
    formAction: "/tasks/new/",
    task: null,
    taskDueAt: formatDateTime(defaultDue),
    taskReminderAt: formatDateTime(defaultReminder),
    contacts,
    deals,
    selectedContactId,
    selectedDealId,
    users: store.users,
    error: null,
  });
});

app.post("/tasks/new/", requireAuth, (req, res) => {
  try {
    const task = store.addTask(req.body, req.currentUser);
    req.session.flash = { type: "success", message: `Задачата "${task.title}" е създадена.` };
    res.redirect("/tasks/");
  } catch (err) {
    const contacts = store.getScopedContacts(req.currentUser).map((c) => store.hydrateContact(c));
    const deals = store.getScopedDeals(req.currentUser);
    res.render("tasks/task_form", {
      title: "Нова задача",
      pageTitle: "Нова задача",
      activeNav: "tasks",
      formAction: "/tasks/new/",
      task: req.body,
      taskDueAt: req.body.dueAt,
      taskReminderAt: req.body.reminderAt,
      contacts,
      deals,
      selectedContactId: Number(req.body.contactId),
      selectedDealId: Number(req.body.dealId),
      users: store.users,
      error: err.message,
    });
  }
});

app.get("/tasks/:id/edit/", requireAuth, (req, res) => {
  const task = store.tasks.find((t) => t.id === Number(req.params.id));
  if (!task) return res.redirect("/tasks/");

  const contacts = store.getScopedContacts(req.currentUser).map((c) => store.hydrateContact(c));
  const deals = store.getScopedDeals(req.currentUser);

  res.render("tasks/task_form", {
    title: `Редакция: ${task.title}`,
    pageTitle: `Редакция: ${task.title}`,
    activeNav: "tasks",
    formAction: `/tasks/${task.id}/edit/`,
    task,
    taskDueAt: formatDateTime(task.dueAt),
    taskReminderAt: formatDateTime(task.reminderAt),
    contacts,
    deals,
    selectedContactId: task.contactId,
    selectedDealId: task.dealId,
    users: store.users,
    error: null,
  });
});

app.post("/tasks/:id/edit/", requireAuth, (req, res) => {
  try {
    store.updateTask(req.params.id, req.body, req.currentUser);
    req.session.flash = { type: "success", message: "Задачата е обновена." };
    res.redirect("/tasks/");
  } catch (err) {
    const contacts = store.getScopedContacts(req.currentUser).map((c) => store.hydrateContact(c));
    const deals = store.getScopedDeals(req.currentUser);
    res.render("tasks/task_form", {
      title: "Редакция на задача",
      pageTitle: "Редакция на задача",
      activeNav: "tasks",
      formAction: `/tasks/${req.params.id}/edit/`,
      task: { ...req.body, id: req.params.id },
      taskDueAt: req.body.dueAt,
      taskReminderAt: req.body.reminderAt,
      contacts,
      deals,
      selectedContactId: Number(req.body.contactId),
      selectedDealId: Number(req.body.dealId),
      users: store.users,
      error: err.message,
    });
  }
});

app.post("/tasks/:id/complete/", requireAuth, (req, res) => {
  try {
    const task = store.completeTask(req.params.id, req.currentUser);
    req.session.flash = { type: "success", message: `Задачата "${task.title}" е завършена.` };
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message };
  }
  const referer = req.get("Referer");
  res.redirect(referer || "/tasks/");
});

// Express v5 catch-all
app.get("*all", (req, res) => {
  res.redirect("/");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sales CRM server running at http://0.0.0.0:${PORT}`);
});
