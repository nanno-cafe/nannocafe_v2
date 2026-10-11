/* Historial y correcciones. Los permisos finales se verifican en Supabase. */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {
    coffee:['+1','Café registrado','positive'], coffee_removed:['−1','Café corregido','correction'],
    gift_redeemed:['★','Regalo entregado','gift-event'], client_created:['＋','Cliente creado','neutral'],
    client_updated:['✎','Datos actualizados','neutral'], client_deactivated:['−','Cliente dado de baja','neutral'],
    client_reactivated:['↗','Cliente reactivado','neutral']
  };
  let sb, admin=false, rows=[], cursor=null, sequence=0, loading=false;
  const date = value => new Intl.DateTimeFormat('es-AR',{
    timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).format(new Date(value));
  function render(events,detail=false) {
    return events.map(e=>{
      const [badge,label,kind] = labels[e.event_type] || ['·','Movimiento','neutral'];
      const balances = e.balance_before !== null && e.balance_before !== undefined
        ? `<span class="event-balance">${Number(e.balance_before)} → ${Number(e.balance_after)} cafés</span>` : '';
      return `<article class="event-row"><span class="event-badge ${kind}" aria-hidden="true">${badge}</span>
        <div class="event-body"><div class="event-title"><strong>${esc(label)}</strong>${balances}</div>
        ${detail ? '' : `<p class="event-client">${esc(e.client_name)}</p>`}
        <p class="event-meta"><time datetime="${esc(e.created_at)}">${esc(date(e.created_at))}</time> · ${esc(e.actor_name || 'Operador no registrado')}</p>
        ${e.reason ? `<p class="event-reason">${esc(e.reason)}</p>` : ''}</div></article>`;
    }).join('');
  }
  async function load(reset=true) {
    if (!sb || (!reset && loading)) return;
    const request = ++sequence;
    loading=true; $('#activityMore').disabled=true;
    $('#activityStatus').textContent='Cargando movimientos…';
    if(reset) { rows=[];cursor=null;$('#activityList').innerHTML='';$('#activityMore').classList.add('hidden'); }
    try {
      const {data,error} = await sb.rpc('get_activity_feed',{
        p_limit:25,p_before_at:cursor?.created_at || null,p_before_id:cursor?.id || null,
        p_type:$('#activityType').value || null,p_search:$('#activitySearch').value.trim()
      });
      if(request!==sequence) return;
      if(error) throw error;
      const items=data?.items || [];
      rows=rows.concat(items);cursor=rows.at(-1) || null;
      $('#activityCount').textContent=`${data.total_count} movimiento${Number(data.total_count)===1?'':'s'}`;
      $('#activityList').innerHTML=rows.length ? render(rows) : '<p class="empty-state">No hay movimientos para esta búsqueda.</p>';
      $('#activityStatus').textContent=rows.length ? `Mostrando ${rows.length} de ${data.total_count}. Horario de Argentina.` : '';
      $('#activityMore').classList.toggle('hidden',items.length<25 || rows.length>=Number(data.total_count));
    } catch {
      if(request!==sequence) return;
      $('#activityStatus').textContent='No se pudieron cargar los movimientos. Tocá Actualizar para reintentar.';
    } finally {
      if(request===sequence){loading=false;$('#activityMore').disabled=false;}
    }
  }
  async function attach(client) {
    sb=client;
    const {data,error}=await sb.rpc('is_admin');admin=!error && data===true;
    $('#activityRefresh').onclick=()=>load();
    $('#activityMore').onclick=()=>load(false);
    $('#activityType').onchange=()=>load();
    let debounce;
    $('#activitySearch').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>load(),250);};
    document.addEventListener('nanno:data',()=>load());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
    await load();
  }
  function bindCorrection(client,onUpdated) {
    const button=$('#removeCoffeeOpen'),form=$('#removeCoffeeForm'),msg=$('#removeCoffeeMsg');
    button.classList.toggle('hidden',!admin || client.coffees<=0);
    form.classList.add('hidden');msg.textContent='';
    let requestId=null,busy=false;
    button.onclick=()=>{
      requestId=crypto.randomUUID();form.reset();form.classList.remove('hidden');
      $('#removeCoffeeSummary').textContent=`${client.name}: pasará de ${client.coffees} a ${client.coffees-1} cafés.`+
        (client.free_coffee_available?' El regalo pendiente dejará de estar disponible.':'');
      $('#removeCoffeeReason').focus();
    };
    $('#removeCoffeeCancel').onclick=()=>{if(!busy)form.classList.add('hidden');};
    form.onsubmit=async event=>{
      event.preventDefault();if(busy || !requestId)return;
      const reason=$('#removeCoffeeReason').value.trim();
      if(reason.length<3){msg.textContent='Escribí un motivo de al menos 3 caracteres.';return;}
      busy=true;const submit=form.querySelector('[type=submit]');
      submit.disabled=true;button.disabled=true;$('#removeCoffeeCancel').disabled=true;
      msg.textContent='Registrando corrección…';
      try {
        const {error}=await sb.rpc('remove_coffee',{
          p_client_id:client.id,p_reason:reason,p_expected_revision:client.loyalty_revision,p_request_id:requestId
        });
        if(error)throw error;
        requestId=null;
        await onUpdated();
        $('#detailMsg').textContent='Se quitó 1 café. La corrección quedó registrada en el historial.';
      } catch(error) {
        if(String(error?.message).includes('STALE_BALANCE')) {
          requestId=null;await onUpdated();
          $('#detailMsg').textContent='El saldo cambió desde que abriste la ficha. Revisalo antes de corregir.';
        } else {
          msg.textContent=String(error?.message).includes('No autorizado')
            ? 'Solo un administrador activo puede corregir cafés.'
            : 'No se pudo confirmar la corrección. Reintentá: la misma solicitud no descuenta dos veces.';
        }
      } finally {busy=false;submit.disabled=false;button.disabled=false;$('#removeCoffeeCancel').disabled=false;}
    };
  }
  window.NannoActivity={attach,load,render,bindCorrection};
})();
