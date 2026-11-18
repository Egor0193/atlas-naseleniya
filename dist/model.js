// Учебный формат CSV: три простых поля без вложенных разделителей.
export function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const cells = line => line.split(delimiter).map(cell => cell.trim());
  if (cells(lines[0]).join(',') !== 'country,year,population') throw Error('Первая строка должна содержать country,year,population.');
  if (lines.length < 2 || lines.length > 10001) throw Error('Нужно от 1 до 10 000 строк данных.');
  const seen = new Set();
  return lines.slice(1).map((line, index) => {
    const fields = cells(line);
    const [country, y, p] = fields;
    if (fields.length !== 3 || !country || country.length > 70 || country.includes('"') || !/^\d{4}$/.test(y) || !/^\d{1,12}$/.test(p))
      throw Error('Строка ' + (index + 2) + '. Проверьте страну, четырёхзначный год и целую численность.');
    const key = JSON.stringify([country, y]);
    if (seen.has(key)) throw Error('Строка ' + (index + 2) + '. Эта страна и год уже есть в файле.');
    seen.add(key);
    return {country, year: Number(y), population: Number(p)};
  });
}
export function selectRows(rows, country, start, end) {
  return rows.filter(r => (!country || r.country === country) && r.year >= start && r.year <= end);
}
export function percentChange(start, end) {
  return start > 0 ? 100 * (end - start) / start : null;
}
export function sorted(rows, key, ascending) {
  return [...rows].sort((a,b) => (typeof a[key] === 'string' ? a[key].localeCompare(b[key], 'ru') : a[key] - b[key]) * (ascending ? 1 : -1));
}
