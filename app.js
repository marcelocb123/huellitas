(() => {
  const STORAGE = {
    reports: 'huellitas_reports_v3',
    settings: 'huellitas_settings_v2'
  };

  // No hay mascotas demo/falsas en adopción ni en reportes públicos.
  // Todo lo que aparezca públicamente proviene de Supabase o de una publicación local creada por el usuario.

  // Directorio inicial de veterinarias reales de Lima, verificado online el 21/09/2026.
  // Los horarios pueden cambiar; la app recomienda confirmar antes de acudir.
  const services = [
    {
      id:'svc-gattos-sanborja', name:'Gattos — sede San Borja', type:'24 horas', district:'San Borja',
      hours:'24 horas, todos los días', phone:'+51 960 640 684', address:'Av. Gálvez Barrenechea 819, San Borja, Lima',
      website:'https://www.gattos.pe/contactanos', sourceLabel:'Web oficial'
    },
    {
      id:'svc-heyvet-reducto', name:'HeyVet Reducto', type:'24 horas', district:'Miraflores',
      hours:'Lun–sáb 08:00–20:00 · emergencias 24 horas', phone:'(01) 628-2000',
      address:'Av. Reducto 1518, Miraflores, Lima', website:'https://www.heyvet.pe/', sourceLabel:'Web oficial'
    },
    {
      id:'svc-heyvet-elpolo', name:'HeyVet El Polo', type:'24 horas', district:'Surco',
      hours:'Lun–sáb 08:00–20:00 · emergencias 24 horas', phone:'(01) 628-2000',
      address:'Av. El Polo 348, Surco, Lima', website:'https://www.heyvet.pe/', sourceLabel:'Web oficial'
    },
    {
      id:'svc-americanvet', name:'American Vet — sede San Borja', type:'Veterinaria', district:'San Borja',
      hours:'Lun–vie 08:00–20:00 · sáb–dom 08:00–17:00', phone:'+51 992 125 188',
      address:'Av. San Luis 2845, San Borja, Lima', website:'https://americanvet.pe/sede-san-borja/', sourceLabel:'Web oficial'
    },
    {
      id:'svc-surco', name:'Clínica Veterinaria Surco', type:'Veterinaria', district:'Surco',
      hours:'Todos los días 09:00–22:00', phone:'+51 1 2714437',
      address:'Av. Paseo La Castellana 386, Surco, Lima', website:'https://www.google.com/maps/search/?api=1&query=Cl%C3%ADnica%20Veterinaria%20Surco%20Av.%20Paseo%20La%20Castellana%20386', sourceLabel:'Ver en Maps'
    },
    {
      id:'svc-pettime', name:'Pet Time Veterinaria — San Borja', type:'Veterinaria', district:'San Borja',
      hours:'Lun–sáb 09:00–19:00 · dom 09:30–19:00', phone:'+51 992 676 904',
      address:'Av. Angamos Este 2455, San Borja, Lima', website:'https://www.google.com/maps/search/?api=1&query=Pet%20Time%20Veterinaria%20Av.%20Angamos%20Este%202455%20San%20Borja', sourceLabel:'Ver en Maps'
    }
  ];

  const main = document.getElementById('main');
  const modalRoot = document.getElementById('modalRoot');
  const toastEl = document.getElementById('toast');
  const navItems = [...document.querySelectorAll('.nav-item')];
  const installBtn = document.getElementById('installBtn');
  const installHelp = document.getElementById('installHelp');
  const notificationsBtn = document.getElementById('notificationsBtn');
  const notificationCount = document.getElementById('notificationCount');

  let currentRoute = 'home';
  let deferredInstall = null;
  let supabaseClient = null;
  let remoteEnabled = false;
  let currentUser = null;
  let reportsCache = [];
  let adoptionsCache = [];
  let adoptionRequestsCache = [];
  let notificationsCache = [];
  let notificationUnreadCount = 0;
  let accountMode = 'link';
  let adoptionTableReady = false;
  let realtimeChannel = null;

  const getSettings = () => {
    try {
      return {theme:'light', ...JSON.parse(localStorage.getItem(STORAGE.settings) || '{}')};
    } catch { return {theme:'light'}; }
  };
  const saveSettings = (s) => localStorage.setItem(STORAGE.settings, JSON.stringify(s));

  const config = window.HUELLITAS_SUPABASE || {};
  const hasSupabaseConfig = Boolean(config.url && config.anonKey && window.supabase);

  const esc = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmtDate = (s) => {
    if (!s) return 'Fecha no indicada';
    const d = new Date(`${s}T00:00:00`);
    return new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',year:'numeric'}).format(d);
  };
  const iconFor = (kind) => ({lost:'⚠',found:'✓',adopt:'♥',service:'✚',report:'＋'}[kind] || '•');
  const activeReports = () => reportsCache.filter(r => r.status !== 'resolved');
  const activeAdoptions = () => adoptionsCache.filter(a => a.status === 'available');

  function setActiveNav(route){
    navItems.forEach(btn => btn.classList.toggle('active', btn.dataset.route === route || (route === 'report' && btn.dataset.route === 'home')));
  }

  function navigate(route){
    currentRoute = route;
    setActiveNav(route);
    window.scrollTo({top:0,behavior:'smooth'});
    if(route === 'home') renderHome();
    if(route === 'lost') renderLost();
    if(route === 'adopt') renderAdopt();
    if(route === 'services') renderServices();
    if(route === 'my') renderMyPublications();
    if(route === 'my') loadMyAdoptionRequests();
    if(route === 'settings') renderSettings();
  }

  function renderHome(){
    const reports = activeReports();
    const lost = reports.filter(r=>r.type==='lost').slice(0,3);
    const adopt = activeAdoptions().slice(0,3);
    const spotlight = lost.find(r=>r.photo_url || r.photo) || adopt.find(p=>p.photo_url);
    main.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <span class="tag">Una comunidad que cuida</span>
          <h1>Un lugar para volver a encontrarse.</h1>
          <p>Reporta mascotas perdidas, ayuda a reunir familias y conoce animales que buscan un hogar.</p>
          <div class="hero-actions"><button class="primary-btn" data-action="reportLost">Publicar un reporte</button><button class="text-btn" data-route="adopt">Conocer adopciones <span aria-hidden="true">→</span></button></div>
          <div class="sync-note"><span class="sync-dot ${remoteEnabled?'is-connected':''}"></span>${remoteEnabled?'Publicaciones sincronizadas':'Conectando con Huellitas'}</div>
        </div>
        ${spotlight ? `<div class="hero-photo"><img src="${esc(spotlight.photo_url || spotlight.photo)}" alt="Mascota publicada en Huellitas" onerror="this.parentElement.classList.add('image-unavailable');this.remove()"><span>Historias reales de nuestra comunidad</span></div>` : `<div class="hero-art" aria-hidden="true"><span>Una huellita puede cambiarlo todo.</span><svg viewBox="0 0 120 120" fill="none"><path d="M53 69c-8 7-17 15-13 24 3 7 11 9 20 4 8-5 14-5 22 0 9 5 17 3 20-4 4-9-5-17-13-24-6-6-11-9-18-9s-12 3-18 9Z" fill="currentColor"/><ellipse cx="30" cy="45" rx="11" ry="16" transform="rotate(-25 30 45)" fill="currentColor"/><ellipse cx="54" cy="31" rx="11" ry="16" transform="rotate(-9 54 31)" fill="currentColor"/><ellipse cx="79" cy="34" rx="11" ry="16" transform="rotate(12 79 34)" fill="currentColor"/><ellipse cx="99" cy="51" rx="11" ry="16" transform="rotate(31 99 51)" fill="currentColor"/></svg></div>`}
      </section>
      <div class="section-head"><div><h2>Mascotas que necesitan ayuda</h2><p>Reportes recientes de la comunidad.</p></div><button class="link-btn" data-route="lost">Ver todo</button></div>
      <div class="cards-grid">${lost.length ? lost.map(reportCard).join('') : emptyBlock('No hay reportes activos todavía.','Sé el primero en publicar uno.')}</div>
      <div class="section-head"><div><h2>Adopciones</h2><p>${adopt.length ? 'Mascotas publicadas por usuarios y rescatistas.' : 'Todavía no hay mascotas publicadas para adopción.'}</p></div><button class="link-btn" data-route="adopt">Ver todo</button></div>
      <div class="cards-grid">${adopt.length ? adopt.map(adoptCard).join('') : emptyBlock('Aún no hay mascotas en adopción.','Cuando alguien publique una, aparecerá aquí.')}</div>
      <div class="community-note"><span class="community-mark">♥</span><div><strong>Una comunidad que acompaña</strong><p>Las publicaciones de Perdidos y Adopta están separadas y se sincronizan con Supabase.</p></div></div>`;
    bindDynamic();
  }

  function emptyBlock(title, body){
    return `<div class="empty" style="grid-column:1/-1"><strong>${esc(title)}</strong>${esc(body)}</div>`;
  }

  function reportCard(r){
    const isLost = r.type === 'lost';
    const owner = remoteEnabled && currentUser && r.user_id === currentUser.id;
    return `<article class="pet-card">
      <img src="${esc(r.photo_url || r.photo || placeholderImage())}" alt="Foto de ${esc(r.name)}" onerror="this.src='${placeholderImage()}'">
      <div class="pet-body">
        <div class="pet-top"><div><h3 class="pet-name">${esc(r.name || 'Sin nombre')}</h3><div class="pet-meta">${esc(r.species)} · ${esc(r.district)}</div></div><span class="badge ${isLost?'danger':'success'}">${isLost?'Perdida':'Encontrada'}</span></div>
        <div class="pet-meta">${fmtDate(r.date)}${owner ? ' · Tu publicación' : ''}</div>
        <div class="card-actions"><button class="secondary-btn" data-action="viewReport" data-id="${esc(r.id)}">Ver</button><button class="primary-btn" data-action="shareReport" data-id="${esc(r.id)}">Compartir</button></div>
      </div></article>`;
  }

  function adoptCard(p){
    const owner = remoteEnabled && currentUser && p.user_id === currentUser.id;
    return `<article class="pet-card">
      <img src="${esc(p.photo_url || placeholderImage())}" alt="Foto de ${esc(p.name)}" onerror="this.src='${placeholderImage()}'">
      <div class="pet-body">
        <div class="pet-top"><div><h3 class="pet-name">${esc(p.name)}</h3><div class="pet-meta">${esc(p.species)} · ${esc(p.age)}</div></div><span class="badge">Adopción</span></div>
        <div class="pet-meta">${esc(p.district)} · ${esc(p.size)}${owner ? ' · Tu publicación' : ''}</div>
        <div class="card-actions"><button class="primary-btn" data-action="viewAdopt" data-id="${esc(p.id)}">Conocer</button></div>
      </div></article>`;
  }

  function renderLost(){
    main.innerHTML = `<section><div class="section-head"><div><span class="eyebrow">ENCUENTROS</span><h2>Mascotas perdidas y encontradas</h2><p>Ayudemos a que cada mascota vuelva a casa.</p></div><div class="section-actions"><button class="secondary-btn" data-action="reportFound">Encontré una mascota</button><button class="primary-btn" data-action="reportLost">＋ Reportar mascota</button></div></div>
      <div class="filters"><input id="reportSearch" placeholder="Buscar por nombre, distrito…" aria-label="Buscar reportes"><select id="reportType"><option value="all">Todos</option><option value="lost">Perdidas</option><option value="found">Encontradas</option></select><select id="reportSpecies"><option value="all">Todas las especies</option><option value="Perro">Perros</option><option value="Gato">Gatos</option></select></div><div id="reportList" class="cards-grid"></div></section>`;
    const update = () => {
      const q = document.getElementById('reportSearch').value.toLowerCase().trim();
      const type = document.getElementById('reportType').value;
      const species = document.getElementById('reportSpecies').value;
      const all = activeReports().filter(r => (type==='all'||r.type===type)&&(species==='all'||r.species===species)&&(`${r.name} ${r.district} ${r.description}`.toLowerCase().includes(q)));
      document.getElementById('reportList').innerHTML = all.length ? all.map(reportCard).join('') : emptyBlock('No encontramos coincidencias.','Prueba con otro distrito o especie.');
      bindDynamic();
    };
    ['reportSearch','reportType','reportSpecies'].forEach(id=>document.getElementById(id).addEventListener(id==='reportSearch'?'input':'change',update));
    update();
  }

  function renderAdopt(){
    const publishButton = remoteEnabled ? `<button class="primary-btn" data-action="publishAdoption">＋ Publicar para adopción</button>` : '';
    const setupNotice = !remoteEnabled ? `<div class="notice">Para publicar y ver adopciones compartidas debes estar conectado a Huellitas.</div>` : (!adoptionTableReady ? `<div class="notice">Falta activar la sección de adopciones en Supabase. Ejecuta el archivo <strong>supabase-adoptions.sql</strong> que viene con esta versión.</div>` : '');
    main.innerHTML = `<section>
      <div class="section-head"><div><h2>Adopciones</h2><p>Aquí solo aparecen mascotas publicadas específicamente para encontrarles hogar.</p></div>${publishButton}</div>
      <div class="adoption-banner"><strong>Adopta con calma y responsabilidad 🐾</strong><p>Revisa la información, conoce el caso y contacta al responsable. Cuando una mascota ya tenga hogar, su publicación se puede marcar como adoptada y deja de aparecer para todos.</p></div>
      ${setupNotice}
      <div class="filters"><input id="adoptSearch" placeholder="Buscar por nombre o distrito…" aria-label="Buscar adopciones"><select id="adoptSpecies"><option value="all">Todas las especies</option><option value="Perro">Perros</option><option value="Gato">Gatos</option><option value="Otro">Otros</option></select><select id="adoptSize"><option value="all">Todos los tamaños</option><option value="Pequeño">Pequeños</option><option value="Mediano">Medianos</option><option value="Grande">Grandes</option><option value="No indicado">No indicado</option></select></div>
      <div id="adoptList" class="cards-grid"></div></section>`;
    const update = () => {
      const q = document.getElementById('adoptSearch').value.toLowerCase().trim();
      const species = document.getElementById('adoptSpecies').value;
      const size = document.getElementById('adoptSize').value;
      const all = activeAdoptions().filter(p => (species==='all'||p.species===species)&&(size==='all'||p.size===size)&&(`${p.name} ${p.district} ${p.description}`.toLowerCase().includes(q)));
      document.getElementById('adoptList').innerHTML = all.length ? all.map(adoptCard).join('') : emptyBlock('Todavía no hay publicaciones para adopción.','Cuando un usuario publique una mascota, aparecerá aquí.');
      bindDynamic();
    };
    ['adoptSearch','adoptSpecies','adoptSize'].forEach(id=>document.getElementById(id).addEventListener(id==='adoptSearch'?'input':'change',update));
    update();
  }

  function serviceCard(s){
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;
    const tel = s.phone.replace(/[^\d+]/g,'').replace(/^0(\d+)/,'51$1');
    return `<article class="service-card">
      <div class="service-icon">✚</div>
      <div><h3>${esc(s.name)}</h3><p>${esc(s.district)} · ${esc(s.type)}</p></div>
      <div class="service-details">
        <div class="detail-row">🕐 <span>${esc(s.hours)}</span></div>
        <div class="detail-row">📍 <span>${esc(s.address)}</span></div>
        <div class="detail-row">📞 <a href="tel:${esc(tel)}">${esc(s.phone)}</a></div>
      </div>
      <div class="service-actions">
        <a class="secondary-btn" style="text-decoration:none;text-align:center" href="${esc(s.website)}" target="_blank" rel="noopener">${esc(s.sourceLabel || 'Web')}</a>
        <a class="primary-btn" style="text-decoration:none;text-align:center" href="${esc(maps)}" target="_blank" rel="noopener">Cómo llegar</a>
      </div>
    </article>`;
  }

  function renderServices(){
    main.innerHTML = `<section><div class="section-head"><div><h2>Veterinarias y servicios</h2><p>Directorio inicial de establecimientos reales en Lima.</p></div></div>
      <div class="notice">ℹ️ Los datos fueron verificados online el 21/09/2026. Horarios y teléfonos pueden cambiar; confirma antes de acudir, sobre todo en una emergencia.</div>
      <div class="filters"><input id="serviceSearch" placeholder="Buscar distrito o veterinaria…" aria-label="Buscar servicios"><select id="serviceType"><option value="all">Todos</option><option value="24 horas">24 horas</option><option value="Veterinaria">Veterinaria</option></select></div>
      <div id="serviceList" class="cards-grid"></div></section>`;
    const update = () => {
      const q = document.getElementById('serviceSearch').value.toLowerCase().trim();
      const type = document.getElementById('serviceType').value;
      const all = services.filter(s=>(type==='all'||s.type===type)&&(`${s.name} ${s.district} ${s.address}`.toLowerCase().includes(q)));
      document.getElementById('serviceList').innerHTML = all.length ? all.map(serviceCard).join('') : emptyBlock('No encontramos veterinarias.','Prueba otro distrito.');
      bindDynamic();
    };
    ['serviceSearch','serviceType'].forEach(id=>document.getElementById(id).addEventListener(id==='serviceSearch'?'input':'change',update));
    update();
  }

  function reportOwnerText(r){
    return `${r.type==='lost'?'Perdida':'Encontrada'} · ${r.species} · ${r.district}`;
  }

  function myReportCard(r){
    const resolved = r.status === 'resolved';
    return `<article class="pet-card ${resolved?'muted-card':''}"><img src="${esc(r.photo_url || r.photo || placeholderImage())}" alt="Foto de ${esc(r.name)}" onerror="this.src='${placeholderImage()}'"><div class="pet-body"><div class="pet-top"><div><h3 class="pet-name">${esc(r.name || 'Sin nombre')}</h3><div class="pet-meta">${esc(reportOwnerText(r))}</div></div><span class="badge ${resolved?'':'danger'}">${resolved?'Resuelta':(r.type==='lost'?'Perdida':'Encontrada')}</span></div><div class="pet-meta">Publicado ${fmtDate(r.date)}</div><div class="card-actions"><button class="secondary-btn" data-action="viewReport" data-id="${esc(r.id)}">Ver</button>${resolved?'':'<button class="primary-btn" data-action="resolveReport" data-id="'+esc(r.id)+'">'+(r.type==='lost'?'Ya la encontré':'Ya entregué a su familia')+'</button>'}<button class="danger-btn" data-action="deleteReport" data-id="${esc(r.id)}">Eliminar</button></div></div></article>`;
  }

  function myAdoptionCard(p){
    const adopted = p.status === 'adopted';
    return `<article class="pet-card ${adopted?'muted-card':''}"><img src="${esc(p.photo_url || placeholderImage())}" alt="Foto de ${esc(p.name)}" onerror="this.src='${placeholderImage()}'"><div class="pet-body"><div class="pet-top"><div><h3 class="pet-name">${esc(p.name)}</h3><div class="pet-meta">${esc(p.species)} · ${esc(p.district)}</div></div><span class="badge ${adopted?'success':''}">${adopted?'Adoptado':'En adopción'}</span></div><div class="pet-meta">${esc(p.age)} · ${esc(p.size)}</div><div class="card-actions"><button class="secondary-btn" data-action="viewAdopt" data-id="${esc(p.id)}">Ver</button>${adopted?'':'<button class="primary-btn" data-action="resolveAdoption" data-id="'+esc(p.id)+'">Ya fue adoptado</button>'}<button class="danger-btn" data-action="deleteAdoption" data-id="${esc(p.id)}">Eliminar</button></div><div class="card-actions"><button class="secondary-btn" data-action="viewAdoptionRequests" data-id="${esc(p.id)}">Ver solicitudes</button></div></div></article>`;
  }

  function renderMyPublications(){
    const mineReports = remoteEnabled && currentUser ? reportsCache.filter(r => r.user_id === currentUser.id) : localReports();
    const mineAdoptions = remoteEnabled && currentUser ? adoptionsCache.filter(a => a.user_id === currentUser.id) : [];
    const resolvedMine = mineReports.filter(r => r.status === 'resolved');
    main.innerHTML = `<section>
      <div class="section-head"><div><span class="eyebrow">TU CUENTA</span><h2>Mi espacio</h2><p>Administra tus reportes y publicaciones de adopción.</p></div><div class="section-actions"><button class="secondary-btn" data-route="settings">Configuración</button><button class="primary-btn" data-action="reportLost">＋ Publicar reporte</button></div></div>
      <div class="section-head"><div><h2>Perdidas y encontradas</h2><p>Tus avisos compartidos con la comunidad.</p></div></div>
      ${mineReports.length ? `<div class="cards-grid">${mineReports.filter(r=>r.status!=='resolved').map(myReportCard).join('')}</div>` : emptyBlock('Todavía no tienes reportes.','Publica una mascota perdida o encontrada.')}
      ${resolvedMine.length ? `<div class="section-head"><div><h2>Casos resueltos</h2><p>Ya no aparecen en la búsqueda pública activa.</p></div></div><div class="cards-grid">${resolvedMine.map(myReportCard).join('')}</div>` : ''}
      <div class="section-head"><div><h2>Solicitudes recibidas</h2><p>Personas interesadas en adoptar tus mascotas.</p></div></div>
      ${currentUser?.is_anonymous?'<div class="notice">Vincula una cuenta verificada desde Configuración para crear nuevas solicitudes o publicaciones de adopción que puedas recuperar en otro dispositivo.</div>':''}
      <div id="receivedRequests">${emptyBlock('Cargando solicitudes…','')}</div>
      <div class="section-head"><div><h2>Solicitudes enviadas</h2><p>Consulta las respuestas de los responsables.</p></div></div>
      <div id="sentRequests">${emptyBlock('Cargando solicitudes…','')}</div>
      <div class="section-head"><div><h2>Mis adopciones</h2><p>Estas publicaciones aparecen únicamente en la sección Adopta.</p></div><button class="primary-btn" data-action="publishAdoption">＋ Publicar para adopción</button></div>
      ${mineAdoptions.length ? `<div class="cards-grid">${mineAdoptions.map(myAdoptionCard).join('')}</div>` : emptyBlock('Todavía no publicaste ninguna mascota para adopción.','Cuando publiques una, podrás marcarla como adoptada o eliminarla.')}
    </section>`;
    bindDynamic();
  }

  async function loadMyAdoptionRequests(){
    if(!remoteEnabled || !currentUser) return;
    const sentEl=document.getElementById('sentRequests'), receivedEl=document.getElementById('receivedRequests');
    if(!sentEl || !receivedEl) return;
    const ownIds=adoptionsCache.filter(a=>a.user_id===currentUser.id).map(a=>a.id);
    try{
      const sentQuery=supabaseClient.from('adoption_requests').select('id,adoption_id,applicant_user_id,name,phone,reason,status,created_at,updated_at').eq('applicant_user_id',currentUser.id).order('created_at',{ascending:false});
      const receivedQuery=ownIds.length ? supabaseClient.from('adoption_requests').select('id,adoption_id,applicant_user_id,name,phone,reason,status,created_at,updated_at').in('adoption_id',ownIds).order('created_at',{ascending:false}) : Promise.resolve({data:[],error:null});
      const [sent,received]=await Promise.all([sentQuery,receivedQuery]);
      if(sent.error) throw sent.error; if(received.error) throw received.error;
      adoptionRequestsCache=[...(sent.data||[]),...(received.data||[])].filter((r,i,all)=>all.findIndex(x=>x.id===r.id)===i);
      sentEl.innerHTML=(sent.data||[]).length ? sent.data.map(renderSentRequest).join('') : emptyBlock('Aún no has enviado solicitudes.','Cuando solicites adoptar, podrás seguir aquí su estado.');
      receivedEl.innerHTML=(received.data||[]).length ? received.data.map(renderReceivedRequest).join('') : emptyBlock('No tienes solicitudes recibidas.','Cuando alguien se interese, aparecerá aquí.');
      sentEl.querySelectorAll('[data-contact-request]').forEach(b=>b.onclick=()=>revealAdoptionContact(b.dataset.contactRequest));
      receivedEl.querySelectorAll('[data-request-status]').forEach(b=>b.onclick=()=>setAdoptionRequestStatus(b.dataset.requestStatus,b.dataset.status));
    }catch(err){
      sentEl.innerHTML=receivedEl.innerHTML=emptyBlock('No se pudieron cargar las solicitudes.',esc(err?.message||'Intenta actualizar la página.'));
    }
  }

  function requestStatusLabel(status){return ({pending:'Pendiente',approved:'Aceptada',rejected:'Rechazada'})[status]||status;}
  function renderReceivedRequest(r){const pet=adoptionsCache.find(a=>a.id===r.adoption_id);return `<article class="request-card"><h3>${esc(r.name)} · ${esc(pet?.name||'Mascota')}</h3><p>Teléfono / WhatsApp: ${esc(r.phone)}</p><p>${esc(r.reason)}</p><span class="badge ${r.status==='approved'?'success':r.status==='rejected'?'danger':''}">${requestStatusLabel(r.status)}</span>${r.status==='pending'?`<div class="card-actions"><button class="primary-btn" data-request-status="${esc(r.id)}" data-status="approved">Aceptar</button><button class="secondary-btn" data-request-status="${esc(r.id)}" data-status="rejected">Rechazar</button></div>`:''}</article>`;}
  function renderSentRequest(r){const pet=adoptionsCache.find(a=>a.id===r.adoption_id);return `<article class="request-card"><h3>${esc(pet?.name||'Mascota')}</h3><p>Enviada ${fmtDate(r.created_at?.slice(0,10))}</p><span class="badge ${r.status==='approved'?'success':r.status==='rejected'?'danger':''}">${requestStatusLabel(r.status)}</span>${r.status==='approved'?`<div class="card-actions"><button class="secondary-btn" data-contact-request="${esc(r.adoption_id)}">Ver contacto del responsable</button></div><div id="contact-${esc(r.adoption_id)}"></div>`:''}</article>`;}

  async function setAdoptionRequestStatus(id,status){
    if(!['approved','rejected'].includes(status)) return;
    const row=adoptionRequestsCache.find(r=>r.id===id); if(!row || !adoptionsCache.some(a=>a.id===row.adoption_id && a.user_id===currentUser?.id)){toast('Solo el responsable puede responder esta solicitud.');return;}
    const {error}=await supabaseClient.from('adoption_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id).eq('status','pending');
    if(error){toast(errorText(error,'No se pudo responder la solicitud.'));return;}
    toast(status==='approved'?'Solicitud aceptada. La mascota sigue disponible hasta que marques su publicación como adoptada.':'Solicitud rechazada.');
    await loadMyAdoptionRequests(); await loadNotifications();
  }

  async function revealAdoptionContact(adoptionId){
    const host=document.getElementById(`contact-${adoptionId}`); if(!host) return;
    const {data,error}=await supabaseClient.from('adoption_contacts').select('contact').eq('adoption_id',adoptionId).maybeSingle();
    if(error || !data){host.innerHTML=`<p>${esc(error?.message||'El contacto no está disponible.')}</p>`;return;}
    const phone=String(data.contact||''), digits=normalizePhone(phone);
    host.innerHTML=`<p>Teléfono / WhatsApp: <a href="https://wa.me/${esc(digits)}" target="_blank" rel="noopener noreferrer">${esc(phone)}</a></p>`;
  }

  function renderSettings(){
    const settings = getSettings();
    const pendingEmail=localStorage.getItem('huellitas_pending_account_email');
    const finishingAccount=Boolean(pendingEmail && currentUser?.email===pendingEmail && currentUser?.email_confirmed_at);
    main.innerHTML = `<section>
      <div class="section-head"><div><h2>Configuración</h2><p>Opciones básicas de Huellitas.</p></div></div>
      <div class="settings-list">
        <div class="setting-item"><div><strong>Estado de sincronización</strong><p>${remoteEnabled ? 'Conectada a la base compartida. Los cambios se sincronizan entre celulares.' : 'Modo local de respaldo.'}</p></div><span class="status-pill ${remoteEnabled?'ok':'warn'}">${remoteEnabled?'Conectada':'Modo local'}</span></div>
        <div class="setting-item account-setting"><div><strong>${currentUser && !currentUser.is_anonymous ? (finishingAccount?'Completa tu cuenta':'Cuenta vinculada') : accountMode==='signin'?'Inicia sesión para recuperar tus datos':'Guarda tus solicitudes en otros dispositivos'}</strong><p>${currentUser && !currentUser.is_anonymous && !finishingAccount ? `Sesión iniciada como ${esc(currentUser.email||'cuenta verificada')}.` : finishingAccount ? 'Correo confirmado. Define una contraseña para iniciar sesión en otros dispositivos.' : accountMode==='signin'?'Usa el correo verificado y la contraseña que vinculaste. Así recuperarás solicitudes y publicaciones en este dispositivo.':'Vincula un correo verificado y una contraseña para recuperar tus solicitudes y publicaciones en otros celulares. Primero confirmaremos tu correo; después podrás definir la contraseña.'}</p>${currentUser?.is_anonymous || finishingAccount ? `<form id="accountForm" class="account-form"><input name="email" type="email" required autocomplete="email" value="${esc(finishingAccount?pendingEmail:'')}" placeholder="Tu correo" ${finishingAccount?'readonly':''}><input name="password" type="password" minlength="8" autocomplete="${accountMode==='signin'?'current-password':'new-password'}" placeholder="Contraseña (8 caracteres)" required><button class="primary-btn" type="submit">${finishingAccount?'Guardar contraseña':accountMode==='signin'?'Iniciar sesión':'Vincular correo'}</button></form>${!finishingAccount?`<button class="text-btn" data-action="toggleAccountMode">${accountMode==='signin'?'Vincular una cuenta nueva':'Ya tengo una cuenta'}</button>`:''}` : ''}</div>${currentUser && !currentUser.is_anonymous && !finishingAccount ? '<button class="secondary-btn" data-action="signOut">Cerrar sesión</button>' : ''}</div>
        <div class="setting-item"><div><strong>Tema</strong><p>Elige cómo quieres ver Huellitas.</p></div><select id="themeSelect" class="compact-select"><option value="light" ${settings.theme==='light'?'selected':''}>Claro</option><option value="dark" ${settings.theme==='dark'?'selected':''}>Oscuro</option></select></div>
        <div class="setting-item"><div><strong>Mis publicaciones</strong><p>Resuelve o elimina tus avisos y administra tus adopciones.</p></div><button class="secondary-btn" data-action="myReports">Abrir</button></div>
        <div class="setting-item"><div><strong>Instalar Huellitas</strong><p>Agrega Huellitas a la pantalla de inicio del celular.</p></div><button class="secondary-btn" data-action="installHelp">Cómo hacerlo</button></div>
        <div class="setting-item"><div><strong>Actualizar datos</strong><p>Vuelve a consultar reportes y adopciones.</p></div><button class="secondary-btn" data-action="refreshAll">Actualizar</button></div>
        <div class="setting-item"><div><strong>Privacidad</strong><p>Tu teléfono solo se comparte con el responsable de la adopción que solicitaste. El teléfono de contacto del responsable se revela al solicitante únicamente tras aceptar.</p></div></div>
        <div class="setting-item"><div><strong>Datos locales</strong><p>Solo afecta respaldos guardados en este navegador; no borra publicaciones compartidas.</p></div><button class="danger-outline" data-action="clearLocal">Limpiar</button></div>
      </div>
    </section>`;
    document.getElementById('themeSelect').addEventListener('change', e=>{ settings.theme=e.target.value; saveSettings(settings); applyTheme(); });
    const accountForm=document.getElementById('accountForm'); if(accountForm) accountForm.addEventListener('submit',linkAccount);
    bindDynamic();
  }

  function bindDynamic(){
    document.querySelectorAll('[data-route]').forEach(el => el.onclick = () => navigate(el.dataset.route));
    document.querySelectorAll('[data-action]').forEach(el => {
      el.onclick = async () => {
        const a = el.dataset.action;
        if(a==='reportLost') openReportModal('lost');
        if(a==='reportFound') openReportModal('found');
        if(a==='adopt') navigate('adopt');
        if(a==='services') navigate('services');
        if(a==='viewReport') openReportDetails(el.dataset.id);
        if(a==='shareReport') shareReport(el.dataset.id);
        if(a==='viewAdopt') openAdoptionDetails(el.dataset.id);
        if(a==='publishAdoption') openAdoptionPublishModal();
        if(a==='resolveReport') await resolveReport(el.dataset.id);
        if(a==='deleteReport') await deleteReport(el.dataset.id);
        if(a==='resolveAdoption') await resolveAdoption(el.dataset.id);
        if(a==='deleteAdoption') await deleteAdoption(el.dataset.id);
        if(a==='viewAdoptionRequests') await showAdoptionRequests(el.dataset.id);
        if(a==='myReports') navigate('my');
        if(a==='installHelp') showInstallHelp(true);
        if(a==='refreshAll') { await refreshAll(); toast('Datos actualizados.'); if(currentRoute==='settings') renderSettings(); }
        if(a==='clearLocal') clearLocalData();
        if(a==='signOut') await signOutAccount();
        if(a==='toggleAccountMode'){accountMode=accountMode==='signin'?'link':'signin';renderSettings();}
      };
    });
  }

  function openReportModal(type='lost'){
    const isFound = type==='found';
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>${isFound?'Encontré una mascota':'Reportar mascota perdida'}</h2><div style="color:var(--muted);font-size:12px;margin-top:3px">La publicación se verá en Perdidas y encontradas, no en Adopta.</div></div><button class="close-btn" id="closeModal">×</button></div>
      <form id="reportForm"><div class="form-grid">
        <div class="field"><label>Tipo</label><select name="type"><option value="lost" ${!isFound?'selected':''}>Se perdió</option><option value="found" ${isFound?'selected':''}>La encontré</option></select></div>
        <div class="field"><label>Nombre / referencia</label><input name="name" placeholder="Ej. Luna / sin nombre" required></div>
        <div class="field"><label>Especie</label><select name="species"><option>Perro</option><option>Gato</option></select></div>
        <div class="field"><label>Distrito</label><input name="district" placeholder="Ej. San Borja" required></div>
        <div class="field"><label>Fecha</label><input type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required></div>
        <div class="field"><label>Teléfono / WhatsApp</label><input name="contact" inputmode="tel" placeholder="999 999 999" required></div>
        <div class="field full"><label>Descripción</label><textarea name="description" placeholder="Color, collar, zona exacta, características…" required></textarea></div>
        <div class="field full"><label>Foto</label><div class="file-box"><input id="reportPhoto" type="file" accept="image/*"><div id="photoPreview" class="file-preview"><img alt="Vista previa"></div></div></div>
      </div><div class="modal-footer"><button type="button" class="secondary-btn" id="cancelModal">Cancelar</button><button class="primary-btn" type="submit">Publicar reporte</button></div></form></div></div>`;
    const photoInput = document.getElementById('reportPhoto');
    photoInput.addEventListener('change', async () => {
      if(!photoInput.files[0]) return;
      try{ const data = await compressImage(photoInput.files[0]); const preview = document.getElementById('photoPreview'); preview.style.display='block'; preview.querySelector('img').src=data.dataUrl; photoInput.dataset.data=data.dataUrl; photoInput._blob=data.blob; }catch{ toast('No se pudo procesar la foto.'); }
    });
    document.getElementById('reportForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const submitBtn = e.currentTarget.querySelector('button[type="submit"]'); submitBtn.disabled=true; submitBtn.textContent='Publicando…';
      const fd = new FormData(e.currentTarget);
      const report = {type:fd.get('type'),name:fd.get('name'),species:fd.get('species'),district:fd.get('district'),date:fd.get('date'),contact:fd.get('contact'),description:fd.get('description')};
      try{
        await publishReport(report, photoInput._blob || null, photoInput.dataset.data || '');
        closeModal(); toast(remoteEnabled ? 'Reporte publicado para todos los usuarios.' : 'Reporte publicado en este dispositivo.'); navigate('lost');
      }catch(err){ submitBtn.disabled=false; submitBtn.textContent='Publicar reporte'; toast(errorText(err,'No se pudo publicar el reporte.')); }
    });
    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('cancelModal').onclick = closeModal;
    document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop') closeModal();});
  }

  async function publishReport(report, blob, localDataUrl){
    if(remoteEnabled){
      let photoUrl = null;
      if(blob && currentUser){
        const path = `${currentUser.id}/${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.jpg`;
        const {error:upErr} = await supabaseClient.storage.from('report-photos').upload(path, blob, {contentType:'image/jpeg',upsert:false});
        if(upErr) throw upErr;
        photoUrl = supabaseClient.storage.from('report-photos').getPublicUrl(path).data.publicUrl;
      }
      const row = {user_id:currentUser.id,...report,photo_url:photoUrl,status:'active'};
      const {data,error} = await supabaseClient.from('reports').insert(row).select().single();
      if(error) throw error;
      reportsCache = [data, ...reportsCache];
      return;
    }
    const reports = localReports();
    reports.unshift({...report,id:crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,status:'active',created_at:new Date().toISOString(),photo:localDataUrl || placeholderImage()});
    setLocalReports(reports); reportsCache = [...reports];
  }

  function openReportDetails(id){
    const r = reportsCache.find(x=>x.id===id); if(!r) return;
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.district+', Lima, Perú')}`;
    const owner = remoteEnabled && currentUser && r.user_id === currentUser.id;
    const actions = `${r.status==='resolved' ? '' : (owner ? `<button class="primary-btn" id="resolveOwnReport">${r.type==='lost'?'Ya la encontré':'Ya entregué a su familia'}</button>` : '')}<button class="secondary-btn" id="closeReportDetail">Cerrar</button>${owner?'<button class="danger-btn" id="deleteOwnReport">Eliminar</button>':''}`;
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><h2>${esc(r.name||'Sin nombre')}</h2><button class="close-btn" id="closeModal">×</button></div><img class="detail-hero" src="${esc(r.photo_url||r.photo||placeholderImage())}" alt="Foto de ${esc(r.name)}" onerror="this.src='${placeholderImage()}'"><div class="pet-top"><div><span class="badge ${r.status==='resolved'?'':' '+(r.type==='lost'?'danger':'success')}">${r.status==='resolved'?'Caso resuelto':(r.type==='lost'?'Mascota perdida':'Mascota encontrada')}</span></div></div><div class="info-list"><div class="info-item"><strong>Especie</strong><span>${esc(r.species)}</span></div><div class="info-item"><strong>Zona</strong><span>${esc(r.district)}</span></div><div class="info-item"><strong>Fecha</strong><span>${fmtDate(r.date)}</span></div><div class="info-item"><strong>Descripción</strong><span>${esc(r.description)}</span></div><div class="info-item"><strong>Contacto</strong><span>${esc(r.contact)}</span></div></div><div class="modal-footer"><a class="secondary-btn" style="text-decoration:none;text-align:center" href="https://wa.me/${normalizePhone(r.contact)}" target="_blank" rel="noopener">WhatsApp</a><a class="primary-btn" style="text-decoration:none;text-align:center" href="${maps}" target="_blank" rel="noopener">Ver zona</a></div><div class="modal-footer">${actions}</div></div></div>`;
    document.getElementById('closeModal').onclick = closeModal;
    const resolveBtn=document.getElementById('resolveOwnReport'); if(resolveBtn) resolveBtn.onclick=async()=>{closeModal(); await resolveReport(id);};
    const delBtn=document.getElementById('deleteOwnReport'); if(delBtn) delBtn.onclick=async()=>{closeModal(); await deleteReport(id);};
    document.getElementById('closeReportDetail').onclick=closeModal;
  }

  async function resolveReport(id){
    if(!canManageReport(id)) { toast('Solo quien publicó el aviso puede cerrarlo.'); return; }
    if(!confirm('¿Confirmas que este caso ya se resolvió? Dejará de aparecer entre las publicaciones activas.')) return;
    if(remoteEnabled){
      const {error}=await supabaseClient.from('reports').update({status:'resolved',updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',currentUser.id);
      if(error){toast(errorText(error,'No se pudo actualizar.'));return;}
      toast('Caso resuelto. Se quitó de la búsqueda activa para todos.'); await loadReports();
    } else {
      const data=localReports().map(r=>r.id===id?{...r,status:'resolved'}:r); setLocalReports(data); reportsCache=[...data]; toast('Caso resuelto en este dispositivo.');
    }
    navigate('my');
  }

  async function deleteReport(id){
    if(!canManageReport(id)) { toast('Solo puedes eliminar tus propias publicaciones.'); return; }
    if(!confirm('¿Eliminar esta publicación? Se quitará para todos los usuarios y no se puede deshacer.')) return;
    const r=reportsCache.find(x=>x.id===id);
    if(remoteEnabled){
      const {error}=await supabaseClient.from('reports').delete().eq('id',id).eq('user_id',currentUser.id);
      if(error){toast(errorText(error,'No se pudo eliminar.'));return;}
      if(r?.photo_url) await tryDeleteStoragePhoto(r.photo_url,'report-photos');
      toast('Publicación eliminada para todos los usuarios.'); await loadReports();
    } else {
      const data=localReports().filter(x=>x.id!==id); setLocalReports(data); reportsCache=[...data]; toast('Publicación eliminada de este dispositivo.');
    }
    navigate('my');
  }

  function canManageReport(id){ return Boolean(remoteEnabled && currentUser && reportsCache.find(r=>r.id===id)?.user_id===currentUser.id) || (!remoteEnabled && localReports().some(r=>r.id===id)); }

  async function tryDeleteStoragePhoto(url,bucket){
    try{ const marker=`/${bucket}/`; const idx=url.indexOf(marker); if(idx<0) return; const path=url.slice(idx+marker.length); await supabaseClient.storage.from(bucket).remove([path]); }catch{}
  }

  async function shareReport(id){
    const r=reportsCache.find(x=>x.id===id); if(!r) return;
    const text=`🐾 Huellitas — ${r.type==='lost'?'Mascota perdida':'Mascota encontrada'}\n${r.name || 'Sin nombre'} · ${r.species}\nZona: ${r.district}\n${r.description}\nContacto: ${r.contact}\n\n${location.href}`;
    try{ if(navigator.share){ await navigator.share({title:'Huellitas',text}); toast('Reporte compartido.'); } else { await navigator.clipboard.writeText(text); toast('Información copiada para compartirla.'); } }catch{}
  }

  function openAdoptionPublishModal(){
    if(!remoteEnabled){ toast('Huellitas debe estar conectada para publicar una adopción.'); return; }
    if(currentUser?.is_anonymous){toast('Vincula un correo verificado y una contraseña para administrar tus adopciones desde otros dispositivos.');navigate('settings');return;}
    if(!adoptionTableReady){ toast('Primero activa la tabla de adopciones con supabase-adoptions.sql.'); return; }
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>Publicar mascota para adopción</h2><div style="font-size:12px;color:var(--muted)">Esta publicación aparecerá únicamente en Adopta.</div></div><button class="close-btn" id="closeModal">×</button></div>
      <form id="adoptPublishForm"><div class="form-grid">
        <div class="field"><label>Nombre</label><input name="name" required placeholder="Ej. Luna"></div>
        <div class="field"><label>Especie</label><select name="species"><option>Perro</option><option>Gato</option><option>Otro</option></select></div>
        <div class="field"><label>Edad</label><input name="age" required placeholder="Ej. 8 meses / 2 años"></div>
        <div class="field"><label>Tamaño</label><select name="size"><option>Pequeño</option><option>Mediano</option><option>Grande</option><option>No indicado</option></select></div>
        <div class="field"><label>Distrito</label><input name="district" required placeholder="Ej. San Borja"></div>
        <div class="field"><label>Teléfono / WhatsApp</label><input name="contact" required inputmode="tel" placeholder="999 999 999"></div>
        <div class="field full"><label>Nombre del refugio, rescatista o responsable <span class="small-note">opcional</span></label><input name="publisher_name" placeholder="Ej. Refugio Patitas Lima"></div>
        <div class="field full"><label>Descripción</label><textarea name="description" required placeholder="Carácter, convivencia, cuidados, esterilización u otra información útil."></textarea></div>
        <div class="field full"><label>Foto</label><div class="file-box"><input id="adoptionPhoto" type="file" accept="image/*" required><div id="adoptionPhotoPreview" class="file-preview"><img alt="Vista previa"></div></div></div>
      </div><div class="modal-footer"><button type="button" class="secondary-btn" id="cancelModal">Cancelar</button><button class="primary-btn" type="submit">Publicar en Adopta</button></div></form></div></div>`;
    const photoInput = document.getElementById('adoptionPhoto');
    photoInput.addEventListener('change', async () => {
      if(!photoInput.files[0]) return;
      try{ const data = await compressImage(photoInput.files[0]); const preview = document.getElementById('adoptionPhotoPreview'); preview.style.display='block'; preview.querySelector('img').src=data.dataUrl; photoInput._blob=data.blob; }catch{ toast('No se pudo procesar la foto.'); }
    });
    document.getElementById('adoptPublishForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const btn=e.currentTarget.querySelector('button[type="submit"]'); btn.disabled=true; btn.textContent='Publicando…';
      const fd=new FormData(e.currentTarget);
      try{
        await publishAdoption(Object.fromEntries(fd.entries()), photoInput._blob || null);
        closeModal(); toast('Mascota publicada en Adopta para todos los usuarios.'); navigate('adopt');
      }catch(err){ btn.disabled=false; btn.textContent='Publicar en Adopta'; toast(errorText(err,'No se pudo publicar la adopción.')); }
    });
    document.getElementById('closeModal').onclick=closeModal; document.getElementById('cancelModal').onclick=closeModal;
  }

  async function publishAdoption(form, blob){
    if(!remoteEnabled || !currentUser) throw new Error('Huellitas no está conectada.');
    let photoUrl=null;
    if(blob){
      const path=`${currentUser.id}/${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.jpg`;
      const {error}=await supabaseClient.storage.from('adoption-photos').upload(path,blob,{contentType:'image/jpeg',upsert:false});
      if(error) throw error;
      photoUrl=supabaseClient.storage.from('adoption-photos').getPublicUrl(path).data.publicUrl;
    }
    const row={user_id:currentUser.id,name:form.name,species:form.species,age:form.age,size:form.size,district:form.district,description:form.description,publisher_name:form.publisher_name||null,photo_url:photoUrl,status:'available'};
    const {data,error}=await supabaseClient.from('adoptions').insert(row).select('id,user_id,name,species,age,size,district,description,publisher_name,photo_url,status,created_at,updated_at').single();
    if(error) throw error;
    const {error:contactError}=await supabaseClient.from('adoption_contacts').insert({adoption_id:data.id,owner_id:currentUser.id,contact:form.contact});
    if(contactError){await supabaseClient.from('adoptions').delete().eq('id',data.id).eq('user_id',currentUser.id);if(photoUrl)await tryDeleteStoragePhoto(photoUrl,'adoption-photos');throw contactError;}
    adoptionsCache=[data,...adoptionsCache];
  }

  function openAdoptionDetails(id){
    const p = adoptionsCache.find(x=>x.id===id); if(!p) return;
    const owner = remoteEnabled && currentUser && p.user_id===currentUser.id;
    const actions = owner
      ? `${p.status==='available'?'<button class="primary-btn" id="resolveAdoptionBtn">Marcar como adoptado</button>':''}<button class="secondary-btn" id="closeAdopt">Cerrar</button><button class="danger-btn" id="deleteAdoptionBtn">Eliminar</button>`
      : `<button class="secondary-btn" id="closeAdopt">Cerrar</button>${currentUser?.is_anonymous?'<button class="primary-btn" id="linkAccountFromAdoption">Vincular cuenta</button>':'<button class="primary-btn" id="applyAdopt">Quiero adoptar</button>'}`;
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>${esc(p.name)}</h2><div style="font-size:12px;color:var(--muted)">${p.status==='adopted'?'Ya adoptado':'Disponible para adopción'}</div></div><button class="close-btn" id="closeModal">×</button></div><img class="detail-hero" src="${esc(p.photo_url||placeholderImage())}" alt="Foto de ${esc(p.name)}" onerror="this.src='${placeholderImage()}'"><div class="info-list"><div class="info-item"><strong>Especie</strong><span>${esc(p.species)}</span></div><div class="info-item"><strong>Edad</strong><span>${esc(p.age)}</span></div><div class="info-item"><strong>Tamaño</strong><span>${esc(p.size)}</span></div><div class="info-item"><strong>Distrito</strong><span>${esc(p.district)}</span></div><div class="info-item"><strong>Descripción</strong><span>${esc(p.description)}</span></div><div class="info-item"><strong>Responsable</strong><span>${esc(p.publisher_name||'Publicación de la comunidad')}</span></div><div class="info-item"><strong>Contacto</strong><span>Se comparte con la persona solicitante si apruebas su solicitud.</span></div></div><div class="modal-footer">${actions}</div></div></div>`;
    document.getElementById('closeModal').onclick=closeModal;
    document.getElementById('closeAdopt').onclick=closeModal;
    const apply=document.getElementById('applyAdopt'); if(apply) apply.onclick=()=>openAdoptionForm(p);
    const link=document.getElementById('linkAccountFromAdoption'); if(link) link.onclick=()=>{closeModal();navigate('settings');};
    const resolve=document.getElementById('resolveAdoptionBtn'); if(resolve) resolve.onclick=async()=>{closeModal();await resolveAdoption(p.id);};
    const del=document.getElementById('deleteAdoptionBtn'); if(del) del.onclick=async()=>{closeModal();await deleteAdoption(p.id);};
  }

  function openAdoptionForm(p){
    if(p.status!=='available'){toast('Esta mascota ya no está disponible para adopción.');return;}
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>Quiero adoptar a ${esc(p.name)}</h2><div style="font-size:12px;color:var(--muted)">Tu solicitud se guardará para el responsable de la publicación.</div></div><button class="close-btn" id="closeModal">×</button></div><form id="adoptionForm"><div class="form-grid"><div class="field"><label>Nombre</label><input name="name" required placeholder="Tu nombre"></div><div class="field"><label>Teléfono / WhatsApp</label><input name="phone" required inputmode="tel" placeholder="999 999 999"></div><div class="field full"><label>¿Por qué quieres adoptar?</label><textarea name="reason" required placeholder="Cuéntanos brevemente sobre tu hogar y disponibilidad."></textarea></div></div><div class="modal-footer"><button type="button" class="secondary-btn" id="cancelModal">Cancelar</button><button class="primary-btn" type="submit">Enviar solicitud</button></div></form></div></div>`;
    document.getElementById('closeModal').onclick=closeModal; document.getElementById('cancelModal').onclick=closeModal;
    document.getElementById('adoptionForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Enviando…';
      const fd=Object.fromEntries(new FormData(e.currentTarget).entries());
      try{
        if(!remoteEnabled || !currentUser) throw new Error('Huellitas no está conectada.');
        const {error}=await supabaseClient.from('adoption_requests').insert({adoption_id:p.id,applicant_user_id:currentUser.id,name:fd.name,phone:fd.phone,reason:fd.reason});
        if(error) throw error;
        closeModal(); toast('Solicitud enviada al responsable.'); navigate('my');
      }catch(err){btn.disabled=false;btn.textContent='Enviar solicitud';toast(errorText(err,'No se pudo enviar la solicitud.'));}
    });
  }

  async function resolveAdoption(id){
    if(!canManageAdoption(id)){toast('Solo quien publicó esta adopción puede cambiar su estado.');return;}
    if(!confirm('¿Confirmas que esta mascota ya fue adoptada? Dejará de aparecer en Adopta para todos.')) return;
    const {error}=await supabaseClient.from('adoptions').update({status:'adopted',updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',currentUser.id);
    if(error){toast(errorText(error,'No se pudo actualizar la adopción.'));return;}
    toast('La publicación pasó a “Adoptado” y ya no aparece públicamente.'); await loadAdoptions(); navigate('my');
  }

  async function deleteAdoption(id){
    if(!canManageAdoption(id)){toast('Solo puedes eliminar tus propias publicaciones de adopción.');return;}
    if(!confirm('¿Eliminar esta publicación de adopción? Desaparecerá para todos los usuarios.')) return;
    const p=adoptionsCache.find(x=>x.id===id);
    const {error}=await supabaseClient.from('adoptions').delete().eq('id',id).eq('user_id',currentUser.id);
    if(error){toast(errorText(error,'No se pudo eliminar la publicación.'));return;}
    if(p?.photo_url) await tryDeleteStoragePhoto(p.photo_url,'adoption-photos');
    toast('Publicación de adopción eliminada para todos.'); await loadAdoptions(); navigate('my');
  }

  function canManageAdoption(id){ return Boolean(remoteEnabled && currentUser && adoptionsCache.find(a=>a.id===id)?.user_id===currentUser.id); }

  async function showAdoptionRequests(adoptionId){
    const p=adoptionsCache.find(x=>x.id===adoptionId); if(!p || !canManageAdoption(adoptionId)){toast('Solo el responsable de la publicación puede ver sus solicitudes.');return;}
    const {data,error}=await supabaseClient.from('adoption_requests').select('*').eq('adoption_id',adoptionId).order('created_at',{ascending:false});
    if(error){toast(errorText(error,'No se pudieron cargar las solicitudes.'));return;}
    const rows=data||[];
    modalRoot.innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>Solicitudes para ${esc(p.name)}</h2><div style="font-size:12px;color:var(--muted)">${rows.length} solicitud(es)</div></div><button class="close-btn" id="closeModal">×</button></div>${rows.length?rows.map(req=>`<div class="setting-item"><div><strong>${esc(req.name)}</strong><p>${esc(req.phone)}<br>${esc(req.reason)}</p><span class="small-note">Estado: ${esc(req.status)}</span></div><select class="compact-select request-status" data-request-id="${esc(req.id)}"><option value="pending" ${req.status==='pending'?'selected':''}>Pendiente</option><option value="approved" ${req.status==='approved'?'selected':''}>Aprobada</option><option value="rejected" ${req.status==='rejected'?'selected':''}>Rechazada</option></select></div>`).join('') : emptyBlock('Aún no hay solicitudes.','Cuando alguien pulse “Quiero adoptar”, aparecerá aquí.') }<div class="modal-footer"><button class="secondary-btn" id="closeRequests">Cerrar</button></div></div></div>`;
    document.getElementById('closeModal').onclick=closeModal;document.getElementById('closeRequests').onclick=closeModal;
    modalRoot.querySelectorAll('.request-status').forEach(sel=>sel.addEventListener('change',async e=>{const id=e.target.dataset.requestId;const {error}=await supabaseClient.from('adoption_requests').update({status:e.target.value}).eq('id',id);if(error){toast(errorText(error,'No se pudo actualizar la solicitud.'));return;}toast('Solicitud actualizada.');}));
  }

  function closeModal(){ modalRoot.innerHTML=''; }

  async function loadNotifications(){
    if(!remoteEnabled || !currentUser) return;
    const [list,countResult]=await Promise.all([
      supabaseClient.from('notifications').select('id,title,body,kind,request_id,is_read,created_at').eq('recipient_user_id',currentUser.id).order('created_at',{ascending:false}).limit(40),
      supabaseClient.from('notifications').select('id',{count:'exact',head:true}).eq('recipient_user_id',currentUser.id).eq('is_read',false)
    ]);
    if(list.error || countResult.error){console.warn('Huellitas notificaciones:',list.error||countResult.error);return;}
    notificationsCache=list.data||[];
    const unread=countResult.count||0;
    notificationUnreadCount=unread;
    notificationCount.textContent=unread>9?'9+':String(unread); notificationCount.hidden=unread===0;
  }

  function openNotifications(){
    const unread=notificationUnreadCount;
    modalRoot.innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>Notificaciones</h2><div style="font-size:12px;color:var(--muted)">${unread?`${unread} sin leer`:'Estás al día'}</div></div><button class="close-btn" id="closeModal">×</button></div>${notificationsCache.length?notificationsCache.map(n=>`<div class="notification-row ${n.is_read?'':'unread'}"><span class="notification-dot" style="${n.is_read?'visibility:hidden':''}"></span><button data-notification-id="${esc(n.id)}"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><span class="small-note">${fmtDate((n.created_at||'').slice(0,10))}</span></button></div>`).join(''):emptyBlock('Aún no tienes notificaciones.','Cuando alguien responda a una solicitud de adopción, te avisaremos aquí.') }<div class="modal-footer"><button class="secondary-btn" id="closeNotifications">Cerrar</button>${unread?'<button class="primary-btn" id="markAllNotifications">Marcar leídas</button>':''}</div></div></div>`;
    document.getElementById('closeModal').onclick=closeModal;document.getElementById('closeNotifications').onclick=closeModal;
    modalRoot.querySelectorAll('[data-notification-id]').forEach(b=>b.onclick=async()=>{const {error}=await supabaseClient.from('notifications').update({is_read:true}).eq('id',b.dataset.notificationId).eq('recipient_user_id',currentUser.id);if(error){toast(errorText(error,'No se pudo marcar como leída.'));return;}closeModal();await loadNotifications();navigate('my');});
    const all=document.getElementById('markAllNotifications'); if(all) all.onclick=async()=>{const {error}=await supabaseClient.from('notifications').update({is_read:true}).eq('recipient_user_id',currentUser.id).eq('is_read',false);if(error){toast(errorText(error,'No se pudieron marcar como leídas.'));return;}await loadNotifications();openNotifications();};
  }

  async function linkAccount(e){
    e.preventDefault(); if(!remoteEnabled || !currentUser) return;
    const fd=new FormData(e.currentTarget),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');
    if(accountMode==='signin'){
      if(currentUser.is_anonymous && !confirm('Los datos que sigan vinculados solo a esta sesión anónima no se trasladarán automáticamente a tu cuenta. ¿Continuar?')) return;
      const {error}=await supabaseClient.auth.signInWithPassword({email,password}); if(error){toast(errorText(error,'No se pudo iniciar sesión.'));return;} window.location.reload(); return;
    }
    const pending=localStorage.getItem('huellitas_pending_account_email');
    if(pending && currentUser.email===pending && currentUser.email_confirmed_at){
      const {error}=await supabaseClient.auth.updateUser({password}); if(error){toast(errorText(error,'No se pudo guardar la contraseña.'));return;}
      localStorage.removeItem('huellitas_pending_account_email'); toast('Cuenta lista. Inicia sesión en otros dispositivos con este correo y contraseña.'); await refreshAll(); renderSettings(); return;
    }
    if(!currentUser.is_anonymous){toast('Esta cuenta ya tiene un correo vinculado.');return;}
    const {error}=await supabaseClient.auth.updateUser({email});
    if(error){toast(errorText(error,'No se pudo vincular el correo.'));return;}
    localStorage.setItem('huellitas_pending_account_email',email);
    toast('Revisa tu correo y confirma el vínculo. Luego vuelve aquí para guardar la contraseña.');
  }

  async function signOutAccount(){
    if(!confirm('Al cerrar sesión, las publicaciones que sigan asociadas a una sesión anónima de este dispositivo no se trasladarán a la cuenta vinculada. ¿Continuar?')) return;
    const {error}=await supabaseClient.auth.signOut(); if(error){toast(errorText(error,'No se pudo cerrar sesión.'));return;}
    window.location.reload();
  }
  function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>toastEl.classList.remove('show'),2600)}
  function placeholderImage(){return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#eef3fb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#1268e8" font-family="Arial" font-size="38">🐾 Huellitas</text></svg>`)}

  async function compressImage(file){
    return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>{ const img=new Image(); img.onload=()=>{ const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height)); const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale); const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height); canvas.toBlob(blob=>{ if(!blob) return reject(new Error('No se pudo procesar la imagen.')); const dataUrl=canvas.toDataURL('image/jpeg',.78); resolve({blob,dataUrl}); },'image/jpeg',.78); }; img.onerror=reject; img.src=reader.result; }; reader.onerror=reject; reader.readAsDataURL(file); });
  }

  function localReports(){ try{const data=JSON.parse(localStorage.getItem(STORAGE.reports)||'[]'); return Array.isArray(data)?data:[];}catch{return[];} }
  function setLocalReports(data){ localStorage.setItem(STORAGE.reports,JSON.stringify(data)); }

  async function loadReports(){
    if(remoteEnabled){
      const {data,error}=await supabaseClient.from('reports').select('*').order('created_at',{ascending:false});
      if(error) throw error; reportsCache=data||[];
    } else reportsCache=localReports();
    if(currentRoute==='home') renderHome();
    if(currentRoute==='lost') renderLost();
    if(currentRoute==='my') renderMyPublications();
  }

  async function loadAdoptions(){
    if(!remoteEnabled){ adoptionsCache=[]; adoptionTableReady=false; return; }
    const {data,error}=await supabaseClient.from('adoptions').select('id,user_id,name,species,age,size,district,description,publisher_name,photo_url,status,created_at,updated_at').order('created_at',{ascending:false});
    if(error){
      adoptionTableReady=false; adoptionsCache=[];
      if(error.code!=='42P01' && error.code!=='PGRST205') console.warn('Huellitas adopciones:',error);
      return;
    }
    adoptionTableReady=true; adoptionsCache=data||[];
    if(currentRoute==='home') renderHome();
    if(currentRoute==='adopt') renderAdopt();
    if(currentRoute==='my'){ renderMyPublications(); loadMyAdoptionRequests(); }
  }

  async function refreshAll(){ await loadReports(); await loadAdoptions(); }

  async function initSupabase(){
    if(!hasSupabaseConfig){ remoteEnabled=false; reportsCache=localReports(); adoptionsCache=[]; return; }
    try{
      supabaseClient = window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      let {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){ const sign=await supabaseClient.auth.signInAnonymously(); if(sign.error) throw sign.error; session=sign.data.session; }
      currentUser=session?.user || null; if(!currentUser) throw new Error('No se pudo crear una sesión.');
      remoteEnabled=true;
      await loadReports();
      await loadAdoptions();
      await loadNotifications();
      notificationsBtn.onclick=openNotifications;
      realtimeChannel = supabaseClient.channel('huellitas-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'reports'},async()=>{ try{await loadReports();}catch{} })
        .on('postgres_changes',{event:'*',schema:'public',table:'adoptions'},async()=>{ try{await loadAdoptions(); if(currentRoute==='settings') renderSettings();}catch{} })
        .on('postgres_changes',{event:'*',schema:'public',table:'adoption_requests'},async()=>{ try{await loadNotifications();if(currentRoute==='my')await loadMyAdoptionRequests();}catch{} })
        .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`recipient_user_id=eq.${currentUser.id}`},async()=>{try{await loadNotifications();}catch{}})
        .subscribe();
    }catch(err){
      remoteEnabled=false; currentUser=null; reportsCache=localReports(); adoptionsCache=[];
      setTimeout(()=>toast('Huellitas está en modo local. Revisa la conexión a Supabase si necesitas compartir publicaciones.'),700);
      console.warn('Huellitas backend:',err);
    }
  }

  function applyTheme(){ document.body.classList.toggle('dark-mode',getSettings().theme==='dark'); }
  function clearLocalData(){ if(!confirm('Esto borra solo datos guardados localmente en este navegador. No elimina publicaciones compartidas. ¿Continuar?')) return; localStorage.removeItem(STORAGE.reports); reportsCache=remoteEnabled?reportsCache:[]; toast('Datos locales limpiados.'); renderSettings(); }
  function errorText(err,fallback){ return err?.message || fallback; }
  function normalizePhone(value=''){ let digits=String(value).replace(/\D/g,''); if(digits.startsWith('51')) return digits; if(digits.startsWith('0')) digits=digits.slice(1); return `51${digits}`; }

  function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isStandalone(){ return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true; }
  function showInstallHelp(force=false){
    if(isStandalone() && !force) return;
    const ios=isIOS();
    installHelp.innerHTML=`<h3>Instala Huellitas en tu celular</h3>${ios?'<p>En iPhone: abre Huellitas en Safari, pulsa <strong>Compartir</strong>, elige <strong>Añadir a pantalla de inicio</strong> y activa <strong>Abrir como app web</strong>.</p>':'<p>En Android: abre Huellitas en Chrome y pulsa <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p>'}<div class="help-actions"><button class="secondary-btn" id="closeInstallHelp">Cerrar</button><button class="primary-btn" id="installHelpBtn">Instalar</button></div>`;
    installHelp.hidden=false; installHelp.classList.add('show');
    document.getElementById('closeInstallHelp').onclick=()=>{installHelp.classList.remove('show');installHelp.hidden=true;};
    document.getElementById('installHelpBtn').onclick=async()=>{ installHelp.classList.remove('show'); installHelp.hidden=true; if(deferredInstall){deferredInstall.prompt(); try{await deferredInstall.userChoice;}catch{} deferredInstall=null; installBtn.hidden=true;} else if(!ios) toast('Usa el menú del navegador para elegir “Instalar aplicación”.'); };
  }

  document.addEventListener('click',e=>{ const routeEl=e.target.closest('[data-route]'); if(routeEl){e.preventDefault();navigate(routeEl.dataset.route);} });
  navItems.forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.route)));
  document.getElementById('settingsBtn').addEventListener('click',()=>navigate('settings'));
  window.addEventListener('beforeinstallprompt', e=>{e.preventDefault();deferredInstall=e;installBtn.hidden=false;});
  installBtn.addEventListener('click',async()=>{if(!deferredInstall){showInstallHelp(true);return;} deferredInstall.prompt(); try{await deferredInstall.userChoice;}catch{} deferredInstall=null;installBtn.hidden=true;});
  window.addEventListener('appinstalled',()=>{installBtn.hidden=true;toast('Huellitas ya está instalada en tu celular.');});
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});

  async function boot(){
    applyTheme();
    await initSupabase();
    renderHome();
  }
  boot();
})();

