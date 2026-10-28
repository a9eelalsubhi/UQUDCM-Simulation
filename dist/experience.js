const $ = id => document.getElementById(id);
const bar = document.createElement('nav');
bar.id = 'experience-bar';
bar.setAttribute('aria-label', 'التنقل والتحكم');
bar.innerHTML = `<div class="bar-modes"></div><details class="bar-menu" id="places-menu"><summary>استكشف المكان <span>⌄</span></summary><div class="menu-content"><h3>انتقل إلى مكان</h3><div id="places-slot"></div></div></details><details class="bar-menu" id="settings-menu"><summary>المزيد <span>⌄</span></summary><div class="menu-content"><h3>خيارات العرض</h3><div id="settings-slot"></div></div></details><div id="launch-slot"></div><button id="show-sim-details" hidden>تفاصيل المحاكاة ☰</button>`;
document.body.append(bar);
bar.querySelector('.bar-modes').append(document.querySelector('#panel .segmented'));
$('places-slot').append($('destinations'));
const settings = $('settings-slot');
settings.append(document.querySelector('#panel .options'),document.querySelector('#panel .quality-label'),$('people-btn'),$('help-btn'));
$('launch-slot').append($('drill-start'));
document.querySelectorAll('#destinations button').forEach(button=>button.addEventListener('click',()=>{$('places-menu').open=false;}));
const simPanel=$('simulation-panel');
const playback=document.createElement('div');playback.id='playback-bar';playback.append($('drill-controls'));document.body.append(playback);
function measureBars(){document.documentElement.style.setProperty('--bar-end',`${Math.ceil(bar.getBoundingClientRect().bottom)}px`);document.documentElement.style.setProperty('--play-end',`${Math.ceil(playback.getBoundingClientRect().bottom)}px`);}
new ResizeObserver(measureBars).observe(bar);new ResizeObserver(measureBars).observe(playback);addEventListener('resize',measureBars);
const cameras=document.querySelector('.drill-cameras');
const cameraDetails=document.createElement('details');cameraDetails.className='camera-menu';cameraDetails.innerHTML='<summary>زوايا المشاهدة ⌄</summary>';cameraDetails.append(cameras);$('drill-controls').append(cameraDetails);
const eventSection=document.querySelector('.event-section');const events=document.createElement('details');events.className='events-fold';events.innerHTML='<summary>محطات المحاكاة والتصفية</summary>';eventSection.before(events);events.append(eventSection);
const detailsButton=$('show-sim-details');detailsButton.onclick=()=>{simPanel.classList.toggle('expanded');detailsButton.setAttribute('aria-expanded',simPanel.classList.contains('expanded'));};
const closePanel=document.createElement('button');closePanel.className='panel-collapse';closePanel.textContent='إخفاء التفاصيل';closePanel.onclick=()=>{simPanel.classList.remove('expanded');detailsButton.setAttribute('aria-expanded','false');};document.querySelector('.simulation-heading').append(closePanel);
function updateMode(){const active=document.body.classList.contains('simulation-view');detailsButton.hidden=!active;if(!active)simPanel.classList.remove('expanded');}
new MutationObserver(updateMode).observe(document.body,{attributes:true,attributeFilter:['class']});updateMode();
document.addEventListener('click',e=>{for(const menu of document.querySelectorAll('.bar-menu, .camera-menu'))if(menu.open&&!menu.contains(e.target))menu.open=false;});
