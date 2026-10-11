/* Apariencia compartida. Solo el admin puede publicar; Supabase valida el rol. */
(() => {
  const palettes = {
    classic: { brand:'#543b2c', ink:'#342c25', muted:'#736758', background:'#f3eddf', paper:'#fffcf5', accent:'#70816c', label:'El ritual de volver.', art:'coffee-art.svg' },
    halloween: { brand:'#edb376', ink:'#f7ead6', muted:'#cfb79a', background:'#231d19', paper:'#342820', accent:'#dc9a60', label:'Un cafecito de otro mundo.', art:'halloween-art.svg' },
    christmas: { brand:'#f0d5a0', ink:'#fff5df', muted:'#d0dccc', background:'#153a30', paper:'#20463a', accent:'#dfa999', label:'Compartir es el mejor regalo.', art:'christmas-art.svg' }
  };
  let sb, state = { theme:'classic', animations_enabled:true };
  let isAdmin = false;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function particles() {
    let layer=document.querySelector('#seasonParticles');
    if(!layer){layer=document.createElement('div');layer.id='seasonParticles';layer.className='season-particles';layer.setAttribute('aria-hidden','true');document.body.prepend(layer);}
    const card=document.querySelector('.loyalty-card');
    let cardLayer=card?.querySelector('.card-particles');
    if(card&&!cardLayer){cardLayer=document.createElement('div');cardLayer.className='season-particles card-particles';cardLayer.setAttribute('aria-hidden','true');card.prepend(cardLayer);}
    [layer,cardLayer].filter(Boolean).forEach(renderParticles);
  }
  function renderParticles(layer) {
    const enabled=state.animations_enabled && !reducedMotion.matches && ['halloween','christmas'].includes(state.theme);
    const signature=enabled?state.theme:'off';
    layer.hidden=!enabled;layer.dataset.paused=document.hidden?'true':'false';
    if(layer.dataset.effect===signature)return;
    layer.dataset.effect=signature;layer.replaceChildren();
    if(!enabled)return;
    const count=state.theme==='halloween'?20:44;
    for(let i=0;i<count;i++){
      const item=document.createElement('span');
      item.className=state.theme==='halloween'?'ambient-bat':'ambient-snow';
      item.style.setProperty('--x',`${(i*37+7)%100}%`);
      item.style.setProperty('--y',`${(i*23+3)%100}%`);
      item.style.setProperty('--duration',`${12+(i*7)%15}s`);
      item.style.setProperty('--delay',`${-((i*11)%29)}s`);
      item.style.setProperty('--drift',`${(i%2?1:-1)*(25+i%5*12)}px`);
      item.style.setProperty('--size',`${state.theme==='halloween'?22+i%4*5:3+i%4}px`);
      if(state.theme==='halloween') item.innerHTML='<svg viewBox="0 0 64 32" aria-hidden="true"><g class="bat-wing left"><path d="M31 17C20 1 7 1 1 4c5 5 4 10 4 14 7-4 13-1 16 7 3-6 7-6 10-4Z"/></g><g class="bat-wing right"><path d="M33 17C44 1 57 1 63 4c-5 5-4 10-4 14-7-4-13-1-16 7-3-6-7-6-10-4Z"/></g><path d="m27 9 3 4h4l3-4 1 12-6 10-6-10Z"/></svg>';
      layer.append(item);
    }
  }
  reducedMotion.addEventListener('change',particles);
  function apply(next) {
    const previous = JSON.stringify(state);
    state = { theme:palettes[next?.theme] ? next.theme : 'classic', animations_enabled:next?.animations_enabled !== false };
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.motion = state.animations_enabled ? 'on' : 'off';
    particles();
    document.querySelectorAll('[data-season-copy]').forEach(el => el.textContent = palettes[state.theme].label);
    document.querySelectorAll('[data-coffee-art]').forEach(el => el.src = palettes[state.theme].art);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palettes[state.theme].background);
    if (JSON.stringify(state) !== previous)
      document.dispatchEvent(new CustomEvent('nanno:theme', {detail:{...state}}));
  }
  async function refresh() {
    try {
      const {data,error} = await sb.rpc('get_appearance');
      if (error || !data?.[0]) return;
      apply(data[0]);
    } catch { /* Si la red falla se conserva la última apariencia de esta página. */ }
  }
  function attach(client) { sb = client; apply(state); return refresh(); }
  async function setupAdmin() {
    const button = document.querySelector('#appearanceOpen');
    if (!button) return;
    const {data,error} = await sb.rpc('is_admin');
    isAdmin = !error && data === true;
    button.classList.toggle('hidden', !isAdmin);
    if (!isAdmin) return;
    const dialog = document.querySelector('#appearanceDialog');
    const form = document.querySelector('#appearanceForm');
    const message = document.querySelector('#appearanceMsg');
    const preview = document.querySelector('#themePreview');
    const updatePreview = () => {
      const theme = form.elements.theme.value;
      preview.dataset.theme = theme;
      preview.querySelector('img').src = palettes[theme].art;
      preview.querySelector('[data-preview-copy]').textContent = palettes[theme].label;
    };
    form.onchange = updatePreview;
    document.querySelector('#appearanceClose').onclick = () => dialog.close();
    button.onclick = async () => {
      message.textContent = 'Cargando configuración…';
      const submit = form.querySelector('[type=submit]');
      submit.disabled = true;
      dialog.showModal();
      try {
        const {data,error} = await sb.from('appearance_settings').select('*').eq('id',true).single();
        if (error) throw error;
        form.elements.theme.value = palettes[data.theme] ? data.theme : 'classic';
        form.elements.starts_on.value = data.starts_on || '';
        form.elements.ends_on.value = data.ends_on || '';
        form.elements.animations_enabled.checked = data.animations_enabled;
        updatePreview(); message.textContent = ''; submit.disabled = false;
      } catch { message.textContent = 'No se pudo cargar la configuración. Cerrá e intentá de nuevo.'; }
    };
    form.onsubmit = async event => {
      event.preventDefault();
      const submit = form.querySelector('[type=submit]');
      if (submit.disabled) return;
      const values = {
        theme:form.elements.theme.value,
        starts_on:form.elements.starts_on.value || null,
        ends_on:form.elements.ends_on.value || null,
        animations_enabled:form.elements.animations_enabled.checked
      };
      if (values.starts_on && values.ends_on && values.ends_on < values.starts_on) {
        message.textContent = 'La fecha de fin debe ser igual o posterior al inicio.'; return;
      }
      submit.disabled = true; message.textContent = 'Guardando…';
      try {
        const {data,error} = await sb.from('appearance_settings').update(values).eq('id',true).select('id');
        if (error || data?.length !== 1) throw error || new Error('Sin permiso');
        await refresh();
        message.textContent = 'Diseño guardado. Se muestra durante las fechas elegidas.';
      } catch { message.textContent = 'No se pudo guardar. Revisá tu conexión y tu permiso de administrador.'; }
      finally { submit.disabled = false; }
    };
  }
  document.addEventListener('visibilitychange', () => {
    particles();
    if (!document.hidden && sb) refresh();
  });
  // Reevalúa fechas también si la tarjeta queda abierta al pasar la medianoche.
  setInterval(() => { if (!document.hidden && sb) refresh(); },60000);
  window.NannoThemes = { attach, refresh, setupAdmin, refreshParticles:particles,
    get palette() { return palettes[state.theme]; }, get state() { return {...state}; } };
})();
