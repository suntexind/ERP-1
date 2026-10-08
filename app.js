const STORAGE_KEY = 'factory-performance-log';

const form = document.getElementById('factoryForm');
const logBody = document.getElementById('logTableBody');
const totalEntriesEl = document.getElementById('totalEntries');
const totalOutputEl = document.getElementById('totalOutput');
const totalScrapEl = document.getElementById('totalScrap');
const efficiencyRateEl = document.getElementById('efficiencyRate');
const searchInput = document.getElementById('searchInput');
const filterShift = document.getElementById('filterShift');
const filterLine = document.getElementById('filterLine');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const clearLogBtn = document.getElementById('clearLogBtn');

function getDefaultDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
}

function readLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLog(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function getEfficiency(actual, target) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

function getFilteredEntries(entries) {
  const search = (searchInput.value || '').trim().toLowerCase();
  const selectedShift = filterShift.value;
  const selectedLine = filterLine.value;

  return entries.filter((entry) => {
    const matchesShift = selectedShift === 'all' || entry.shift === selectedShift;
    const matchesLine = selectedLine === 'all' || entry.line === selectedLine;
    const searchable = `${entry.product} ${entry.operator}`.toLowerCase();
    const matchesSearch = !search || searchable.includes(search);

    return matchesShift && matchesLine && matchesSearch;
  });
}

function renderTable(entries) {
  logBody.innerHTML = '';

  if (!entries.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="11" class="empty-state">No matching records found.</td>';
    logBody.appendChild(row);
    return;
  }

  const orderedEntries = [...entries].reverse();

  orderedEntries.forEach((entry) => {
    const row = document.createElement('tr');
    const efficiency = getEfficiency(Number(entry.actualQty || 0), Number(entry.targetQty || 0));

    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.shift}</td>
      <td>${entry.line}</td>
      <td>${entry.operator}</td>
      <td>${entry.product}</td>
      <td>${entry.targetQty}</td>
      <td>${entry.actualQty}</td>
      <td>${entry.scrapQty}</td>
      <td>${entry.downtime}</td>
      <td>${efficiency}%</td>
      <td>${entry.notes || '-'}</td>
    `;

    logBody.appendChild(row);
  });
}

function updateStats(entries) {
  const totalEntries = entries.length;
  const totalOutput = entries.reduce((sum, entry) => sum + Number(entry.actualQty || 0), 0);
  const totalScrap = entries.reduce((sum, entry) => sum + Number(entry.scrapQty || 0), 0);
  const totalTarget = entries.reduce((sum, entry) => sum + Number(entry.targetQty || 0), 0);

  const overallEfficiency = totalTarget > 0 ? Math.round((totalOutput / totalTarget) * 100) : 0;

  totalEntriesEl.textContent = totalEntries;
  totalOutputEl.textContent = totalOutput;
  totalScrapEl.textContent = totalScrap;
  efficiencyRateEl.textContent = `${overallEfficiency}%`;
}

function refreshView() {
  const entries = readLog();
  const filteredEntries = getFilteredEntries(entries);
  renderTable(filteredEntries);
  updateStats(entries);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const entry = Object.fromEntries(formData.entries());
  const entries = readLog();

  entry.date = entry.date || getDefaultDate();
  entry.targetQty = Number(entry.targetQty || 0);
  entry.actualQty = Number(entry.actualQty || 0);
  entry.scrapQty = Number(entry.scrapQty || 0);
  entry.downtime = Number(entry.downtime || 0);
  entry.hoursWorked = Number(entry.hoursWorked || 0);

  entries.push(entry);
  writeLog(entries);
  form.reset();
  form.elements.date.value = getDefaultDate();
  refreshView();
});

searchInput.addEventListener('input', refreshView);
filterShift.addEventListener('change', refreshView);
filterLine.addEventListener('change', refreshView);

downloadCsvBtn.addEventListener('click', () => {
  const entries = readLog();
  if (!entries.length) {
    alert('No data to export yet.');
    return;
  }

  const headers = ['date', 'shift', 'line', 'operator', 'product', 'targetQty', 'actualQty', 'scrapQty', 'downtime', 'hoursWorked', 'notes'];
  const csvRows = [headers.join(',')];

  entries.forEach((entry) => {
    const values = headers.map((header) => {
      const value = String(entry[header] ?? '').replace(/"/g, '""');
      return `"${value}"`;
    });
    csvRows.push(values.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'factory-performance-log.csv';
  link.click();
  URL.revokeObjectURL(url);
});

clearLogBtn.addEventListener('click', () => {
  if (!window.confirm('Clear all production records?')) return;
  writeLog([]);
  refreshView();
});

form.elements.date.value = getDefaultDate();
refreshView();



