const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "fintrack_transactions";
const BUDGET_KEY = "fintrack_budget";

const startingTransactions = [
    { id: 1, title: "Monthly Salary", category: "Salary", type: "income", amount: 40000, date: "2026-10-01" },
    { id: 2, title: "Groceries", category: "Food", type: "expense", amount: 2500, date: "2026-10-02" },
    { id: 3, title: "New Clothes", category: "Shopping", type: "expense", amount: 5000, date: "2026-10-04" },
    { id: 4, title: "Bus and Cab", category: "Transport", type: "expense", amount: 1500, date: "2026-10-05" },
    { id: 5, title: "Electricity Bill", category: "Bills", type: "expense", amount: 3000, date: "2026-10-07" },
    { id: 6, title: "Course Materials", category: "Education", type: "expense", amount: 3000, date: "2026-10-09" }
];

let transactions;

try {
    const saved = localStorage.getItem(STORAGE_KEY);
    transactions = saved ? JSON.parse(saved) : startingTransactions;
    if (!Array.isArray(transactions)) transactions = startingTransactions;
} catch {
    transactions = startingTransactions;
}

let monthlyBudget = Number(localStorage.getItem(BUDGET_KEY)) || 25000;
let expenseChart = null;

const money = (amount) =>
    "₹" + Number(amount).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(BUDGET_KEY, monthlyBudget);
}

function getTotals() {
    let income = 0;
    let expenses = 0;

    transactions.forEach((item) => {
        if (item.type === "income") {
            income += Number(item.amount);
        } else {
            expenses += Number(item.amount);
        }
    });

    return {
        income,
        expenses,
        balance: income - expenses
    };
}

function renderDashboard() {
    const totals = getTotals();

    $("balance").textContent = money(totals.balance);
    $("income").textContent = money(totals.income);
    $("expenses").textContent = money(totals.expenses);

    $("budgetSpent").textContent = money(totals.expenses);
    $("budgetInput").value = monthlyBudget;

    const percentage = monthlyBudget > 0
        ? (totals.expenses / monthlyBudget) * 100
        : 0;

    $("budgetProgress").style.width =
        Math.min(percentage, 100) + "%";

    if (percentage > 100) {
        $("budgetMessage").textContent =
            "Budget exceeded by " +
            money(totals.expenses - monthlyBudget);
    } else {
        $("budgetMessage").textContent =
            Math.round(percentage) + "% of your budget used";
    }

    renderTransactions();
    renderChart();
}

function renderTransactions() {
    const list = $("transactionList");
    list.replaceChildren();

    const sorted = [...transactions].sort((a, b) =>
        b.date.localeCompare(a.date) || b.id - a.id
    );

    $("emptyMessage").classList.toggle(
        "hidden",
        sorted.length !== 0
    );

    sorted.forEach((item) => {
        const row = document.createElement("tr");

        const titleCell = document.createElement("td");
        const title = document.createElement("span");
        title.className = "transaction-name";
        title.textContent = item.title;
        titleCell.appendChild(title);

        const categoryCell = document.createElement("td");
        const category = document.createElement("span");
        category.className = "category-pill";
        category.textContent = item.category;
        categoryCell.appendChild(category);

        const dateCell = document.createElement("td");
        dateCell.textContent = new Date(
            item.date + "T00:00:00"
        ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        const amountCell = document.createElement("td");
        amountCell.className = item.type === "income"
            ? "amount-income"
            : "amount-expense";

        amountCell.textContent =
            (item.type === "income" ? "+ " : "- ") +
            money(item.amount);

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute(
            "aria-label",
            "Delete " + item.title
        );

        deleteButton.addEventListener("click", () => {
            if (confirm("Delete this transaction?")) {
                transactions = transactions.filter(
                    (transaction) => transaction.id !== item.id
                );

                saveData();
                renderDashboard();
            }
        });

        actionCell.appendChild(deleteButton);

        row.append(
            titleCell,
            categoryCell,
            dateCell,
            amountCell,
            actionCell
        );

        list.appendChild(row);
    });
}

function renderChart() {
    const canvas = $("expenseChart");

    if (typeof Chart === "undefined") {
        canvas.style.display = "none";
        return;
    }

    canvas.style.display = "block";

    const categories = {};

    transactions
        .filter((item) => item.type === "expense")
        .forEach((item) => {
            categories[item.category] =
                (categories[item.category] || 0) +
                Number(item.amount);
        });

    const labels = Object.keys(categories);
    const values = Object.values(categories);

    const isDark = document.body.classList.contains("dark");
    const textColor = isDark ? "#c5ccda" : "#697386";

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    "#6c63ff",
                    "#16a675",
                    "#ffad60",
                    "#e65353",
                    "#42a5f5",
                    "#c678dd",
                    "#8d99ae"
                ],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 16,
                        font: {
                            family: "Inter",
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            context.label + ": " + money(context.raw)
                    }
                }
            }
        }
    });
}

// Show or hide the transaction form
$("addBtn").addEventListener("click", () => {
    $("transactionForm").classList.toggle("hidden");

    if (!$("transactionForm").classList.contains("hidden")) {
        $("titleInput").focus();
    }
});

// Add a new transaction
$("transactionForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("titleInput").value.trim();
    const amount = Number($("amountInput").value);
    const type = $("typeInput").value;
    const category = $("categoryInput").value;

    if (!title || !Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a name and a valid amount.");
        return;
    }

    transactions.push({
        id: Date.now(),
        title,
        amount,
        type,
        category,
        date: new Date().toLocaleDateString("en-CA")
    });

    saveData();
    renderDashboard();

    $("transactionForm").reset();
    $("transactionForm").classList.add("hidden");
});

// Update monthly budget
$("saveBudget").addEventListener("click", () => {
    const value = Number($("budgetInput").value);

    if (!Number.isFinite(value) || value <= 0) {
        alert("Enter a budget greater than zero.");
        return;
    }

    monthlyBudget = value;
    saveData();
    renderDashboard();
});

// Dark and light mode
$("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    $("themeBtn").textContent = isDark
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";

    localStorage.setItem(
        "fintrack_theme",
        isDark ? "dark" : "light"
    );

    renderChart();
});

// Restore saved theme
if (localStorage.getItem("fintrack_theme") === "dark") {
    document.body.classList.add("dark");
    $("themeBtn").textContent = "☀️ Light Mode";
}

renderDashboard();
