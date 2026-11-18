const svgNS = 'http://www.w3.org/2000/svg';
const palette = ['#284d48','#80a666','#437488','#c09355','#777595','#9a625a'];
const format = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
function svgElement(tag, attrs, label) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
  if (label !== undefined) node.textContent = label;
  return node;
}
export function lineChart(container, rows) {
  container.replaceChildren();
  if (!rows.length) {container.textContent='За этот период наблюдений нет.';return;}
  const svg = svgElement('svg',{viewBox:'0 0 600 240',role:'img','aria-label':'Динамика населения в миллионах человек. Точные значения приведены в таблице.'});
  const values = rows.map(r=>r.population/1e6);
  const min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max((max-min)*0.12,max*0.002,0.000001);
  const low = Math.max(0,min-pad), high = max+pad;
  const first = rows[0].year, last = rows.at(-1).year;
  const x = year => first===last ? 320 : 75+(year-first)/(last-first)*495;
  const y = value => 196-(value-low)/(high-low)*166;
  for (let i=0;i<=4;i++) {
    const v = low + (high-low)*i/4;
    svg.append(svgElement('line',{x1:72,x2:574,y1:y(v),y2:y(v),stroke:'#dce4dc','stroke-dasharray':'4 4'}), svgElement('text',{x:65,y:y(v)+4,'text-anchor':'end',fill:'#4a5c59','font-size':13},format.format(v)));
  }
  let previous;
  for (const row of rows) {
    const cx=x(row.year), cy=y(row.population/1e6);
    if(previous && row.year===previous.year+1) svg.append(svgElement('line',{x1:x(previous.year),y1:y(previous.population/1e6),x2:cx,y2:cy,stroke:'#387357','stroke-width':3}));
    const dot=svgElement('circle',{cx,cy,r:3,fill:'#387357'});
    dot.append(svgElement('title',{},row.year+' · '+format.format(row.population)+' чел.'));
    svg.append(dot);previous=row;
  }
  const labels = [...new Set([first, ...(last-first>5?[Math.round((first+last)/2)]:[]),last])];
  labels.forEach(year=>svg.append(svgElement('text',{x:x(year),y:222,'text-anchor':'middle',fill:'#4a5c59','font-size':14},year)));
  container.append(svg);
}
function element(tag,cls,text) {
  const node=document.createElement(tag);node.className=cls;
  if(text!==undefined) node.textContent=text;
  return node;
}
export function comparison(rank,pie,rows,country) {
  rank.replaceChildren();pie.replaceChildren();
  if(!rows.length){rank.textContent=pie.textContent='Нет наблюдений.';return;}
  const total=rows.reduce((s,r)=>s+r.population,0);
  const legend=element('div','legend'), stops=[];
  let angle=0;
  rows.forEach((r,i)=>{
    const bar=element('div','bar'+(country===r.country?' active':''));
    const track=element('div','track'), fill=element('i','');
    fill.style.width=(rows[0].population ? 100*r.population/rows[0].population : 0)+'%';
    track.append(fill);bar.append(element('span','',r.country),track,element('span','',format.format(r.population/1e6)));rank.append(bar);
    if(!total)return;
    const share=r.population/total, color=palette[i%palette.length];
    const item=element('span',''), dot=element('i','dot');dot.style.background=color;
    item.append(dot,document.createTextNode(r.country+' · '+format.format(share*100)+'%'));legend.append(item);
    stops.push(color+' '+angle+'deg '+(angle+share*360)+'deg');angle+=share*360;
  });
  if(!total){pie.textContent='Доли не определены при нулевой сумме.';return;}
  const circle=element('div','donut');circle.style.background='conic-gradient('+stops.join(',')+')';
  circle.setAttribute('aria-hidden','true');pie.append(circle,legend);
}
