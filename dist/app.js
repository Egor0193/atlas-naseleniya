import {parseCSV, selectRows, percentChange, sorted} from './model.js';
import {lineChart, comparison} from './charts.js';
const el = id => document.getElementById(id);
const set = (id,value) => {el(id).textContent=value};
const number = (n,digits=0) => n.toLocaleString('ru-RU',{maximumFractionDigits:digits});
let data=[], builtin=[], custom=false, page=0, sortKey='year', ascending=false;
const builtinOrigin=el('origin').textContent;
function options(id,values,wanted,fallback) {
  el(id).replaceChildren(...values.map(v=>new Option(v,v)));
  el(id).value=values.map(String).includes(String(wanted))?wanted:fallback;
}
function prepare(params=new URLSearchParams()) {
  const countries=[...new Set(data.map(r=>r.country))].sort((a,b)=>a.localeCompare(b,'ru'));
  const years=[...new Set(data.map(r=>r.year))].sort((a,b)=>a-b);
  options('country',countries,params.get('country'),countries.includes('Беларусь')?'Беларусь':countries[0]);
  options('start',years,params.get('start'),years[0]); options('end',years,params.get('end'),years.at(-1));
  if(+el('start').value>+el('end').value)el('start').value=years[0];
  el('all').checked=params.get('all')==='1';
  sortKey=['country','year','population'].includes(params.get('sort'))?params.get('sort'):'year';
  ascending=params.get('asc')==='1';page=0;render();
}
function render() {
  if(!data.length)return;
  const country=el('country').value,start=+el('start').value,end=+el('end').value;
  const selected=sorted(selectRows(data,country,start,end),'year',true);
  const ending=sorted(selectRows(data,'',end,end),'population',false);
  const first=selected.find(r=>r.year===start),last=selected.find(r=>r.year===end);
  const sum=ending.reduce((s,r)=>s+r.population,0);
  const change=first&&last?percentChange(first.population,last.population):null;
  set('total', last?number(last.population):'—');set('totalNote',country+' · '+end+' г., человек');
  set('delta',change===null?'—':number(change,2)+' %');set('deltaNote',first&&last?number(last.population-first.population)+' чел. за '+start+'–'+end:'Нет данных на границе периода');
  set('shareValue',last&&sum?number(100*last.population/sum,2)+' %':'—');set('shareNote','От суммы доступных значений за '+end+' г.');
  set('trendLabel',country+' · млн человек');set('rankLabel',end+' год · млн человек');set('pieLabel','Распределение населения за '+end+' год');
  lineChart(el('trend'),selected);comparison(el('rank'),el('pie'),ending,country);
  const rows=sorted(selectRows(data,el('all').checked?'':country,start,end),sortKey,ascending);
  page=Math.max(0,Math.min(page,Math.ceil(rows.length/10)-1));
  const body=document.querySelector('tbody');body.replaceChildren();
  rows.slice(page*10,page*10+10).forEach(r=>{
    const tr=body.insertRow();[r.country,r.year,number(r.population)].forEach(v=>tr.insertCell().textContent=v);
  });
  set('rowCount',rows.length?'Наблюдений: '+rows.length:'Нет наблюдений за выбранный период.');
  set('page',rows.length?(page+1)+' / '+Math.ceil(rows.length/10):'0 / 0');
  el('prev').disabled=page===0;el('next').disabled=(page+1)*10>=rows.length;
  document.querySelectorAll('[data-key]').forEach(b=>b.parentElement.setAttribute('aria-sort',b.dataset.key===sortKey?(ascending?'ascending':'descending'):'none'));
  el('panel').hidden=false;el('share').disabled=custom;
}
for(const id of ['country','start','end','all']) el(id).onchange=()=>{
  if(+el('start').value>+el('end').value)el(id==='start'?'end':'start').value=el(id).value;
  page=0;set('status','');render();
};
el('reset').onclick=()=>prepare();
el('prev').onclick=()=>{page--;render()};el('next').onclick=()=>{page++;render()};
document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{
  ascending=b.dataset.key===sortKey?!ascending:true;sortKey=b.dataset.key;page=0;render();
});
el('share').onclick=async()=>{
  const url=new URL(location.href);url.hash='';url.search='';
  for(const id of ['country','start','end'])url.searchParams.set(id,el(id).value);
  url.searchParams.set('sort',sortKey);url.searchParams.set('asc',ascending?'1':'0');url.searchParams.set('all',el('all').checked?'1':'0');
  history.replaceState(null,'',url);
  try {await navigator.clipboard.writeText(url.href);set('status','Ссылка скопирована.');}
  catch {set('status','Ссылка с фильтрами готова в адресной строке.');}
};
let request=0;
function showDataset(rows,filename) {
  data=rows;custom=Boolean(filename);
  set('heading',custom?'Свой набор данных':'Беларусь и соседи');
  set('subtitle',custom?filename:'Численность населения шести стран с 2000 по 2025 год.');
  set('origin',custom?'Отображается локальный файл '+filename+'. Источник и условия использования определяет владелец файла. Ссылки ниже относятся к встроенному набору.':builtinOrigin);
  el('restore').hidden=!custom;el('retry').hidden=true;set('status','');
}
async function loadBuiltin(params=new URLSearchParams()) {
  const id=++request;set('status','Загрузка данных…');el('retry').hidden=true;
  try{
    if(!builtin.length){
      const response=await fetch('data/population.csv');if(!response.ok)throw Error();
      builtin=parseCSV(await response.text());
    }
    if(id!==request)return;showDataset(builtin,'');prepare(params);
  }catch{if(id===request){set('status','Не удалось загрузить встроенный CSV. Проверьте соединение и повторите попытку.');el('retry').hidden=false;}}
}
el('retry').onclick=()=>loadBuiltin(new URLSearchParams(location.search));
el('file').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;const ticket=++request;
  try{
    if(file.size>1_000_000)throw Error('Файл больше 1 МБ.');
    const parsed=parseCSV(await file.text());if(ticket!==request)return;
    showDataset(parsed,file.name);prepare();set('importMessage','Загружено строк: '+data.length+'. Локальный файл доступен в этой вкладке.');
  }catch(error){if(ticket===request){set('importMessage',error.message);if(!data.length){set('status','Выберите корректный CSV или повторите загрузку встроенного.');el('retry').hidden=false;}}}
  event.target.value='';
};
el('restore').onclick=()=>{set('importMessage','');loadBuiltin()};
loadBuiltin(new URLSearchParams(location.search));
