(() => {
  const STORAGE = {
    reports: 'huellitas_reports_v2',
    adoption: 'huellitas_adoption_v1',
    settings: 'huellitas_settings_v1'
  };

  const sampleReports = [
    {id:'demo-r1',type:'lost',name:'Luna',species:'Perro',district:'Surco',date:'2026-09-17',description:'Hembra pequeña, color crema, collar rosado. Se perdió cerca del parque.',contact:'999 111 222',photo:'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80',demo:true},
    {id:'demo-r2',type:'found',name:'Max',species:'Perro',district:'Miraflores',date:'2026-09-18',description:'Macho mediano, pelaje marrón y blanco. Encontrado caminando solo.',contact:'987 222 333',photo:'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80',demo:true},
    {id:'demo-r3',type:'lost',name:'Michi',species:'Gato',district:'San Borja',date:'2026-09-14',description:'Gato negro con ojos amarillos. Muy dócil. Responde a Michi.',contact:'986 333 444',photo:'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80',demo:true},
    {id:'demo-r4',type:'found',name:'Sin nombre',species:'Gato',district:'Barranco',date:'2026-09-19',description:'Gatita tricolor encontrada cerca del malecón.',contact:'985 444 555',photo:'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=900&q=80',demo:true}
  ];

  const adoptionPets = [
    {id:'a1',name:'Coco',species:'Perro',age:'1 año',size:'Pequeño',district:'La Molina',description:'Cariñoso, juguetón y sociable. Busca una familia responsable.',photo:'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80',org:'Refugio Huellitas Lima'},
    {id:'a2',name:'Mora',species:'Gato',age:'8 meses',size:'Pequeño',district:'Surco',description:'Tranquila, curiosa y muy cariñosa cuando toma confianza.',photo:'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=80',org:'Casa Temporal Surco'},
    {id:'a3',name:'Bruno',species:'Perro',age:'2 años',size:'Mediano',district:'Chorrillos',description:'Activo y noble. Ideal para una familia que disfrute pasear.',photo:'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80',org:'Rescate Patitas'},
    {id:'a4',name:'Nala',species:'Gato',age:'1 año',size:'Pequeño',district:'Miraflores',description:'Amable y limpia. Convive bien con personas.',photo:'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=80',org:'Red Gatos Lima'},
    {id:'a5',name:'Simba',species:'Perro',age:'6 meses',size:'Mediano',district:'San Miguel',description:'Cachorro energético y amistoso. Requiere tiempo para educación básica.',photo:'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=900&q=80',org:'Voluntarios San Miguel'},
    {id:'a6',name:'Milo',species:'Gato',age:'2 años',size:'Pequeño',district:'San Borja',description:'Muy tranquilo, busca un hogar donde pueda estar acompañado.',photo:'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',org:'Hogar Temporal SB'}
  ];

  const services = [
    {id:'v1',name:'Veterinaria 24/7 Miraflores',type:'Emergencias',district:'Miraflores',hours:'24 horas',phone:'(01) 555-0101',address:'Av. Benavides, Miraflores, Lima'},
    {id:'v2',name:'Clínica Vet San Borja',type:'Veterinaria',district:'San Borja',hours:'08:00–20:00',phone:'(01) 555-0102',address:'Av. Aviación, San Borja, Lima'},
    {id:'v3',name:'Centro Veterinario Surco',type:'Veterinaria',district:'Surco',hours:'09:00–21:00',phone:'(01) 555-0103',address:'Av. Caminos del Inca, Surco, Lima'},
    {id:'v4',name:'Veterinaria Barranco',type:'Veterinaria',district:'Barranco',hours:'09:00–19:00',phone:'(01) 555-0104',address:'Av. Grau, Barranco, Lima'}
  ];

  const main = document.getElementById('main');
  const modalRoot = document.getElementById('modalRoot');
  const toastEl = document.getElementById('toast');
  const navItems = [...document.querySelectorAll('.nav-item')];
  const installBtn = document.getElementById('installBtn');
  const installHelp = document.getElementById('installHelp');
  let currentRoute = 'home';
  let deferredInstall = null;
  let supabaseClient = null;
  let remoteEnabled = false;
  let currentUser = null;
  let reportsCache = [];
  let realtimeChannel = null;

  const getSettings = () => {
    try {
      return {theme:'light', installTips:true, ...JSON.parse(localStorage.getItem(STORAGE.settings) || '{}')};
    } catch { return {theme:'light', installTips:true}; }
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

  function setActiveNav(route){ navItems.forEach(btn => btn.classList.toggle('active', btn.dataset.route === route || (route === 'report' && btn.dataset.route === 'home'))); }
  function navigate(route){
    currentRoute = route;
    setActiveNav(route);
    window.scrollTo({top:0,behavior:'smooth'});
    if(route === 'home') renderHome();
    if(route === 'lost') renderLost();
    if(route === 'adopt') renderAdopt();
    if(route === 'services') renderServices();
    if(route === 'my') renderMyReports();
    if(route === 'settings') renderSettings();
  }

  function activeReports(){ return reportsCache.filter(r => r.status !== 'resolved'); }

  function renderHome(){
    const reports = activeReports();
    const lost = reports.filter(r=>r.type==='lost').slice(0,3);
    const adopt = adoptionPets.slice(0,3);
    main.innerHTML = `
      <section class="hero">
        <span class="tag">🐾 Bienvenido a Huellitas</span>
        <h1>Que encontrar ayuda sea cuestión de un click.</h1>
        <p>Una plataforma simple para reportar mascotas, ayudar a encontrarlas, conocer opciones de adopción y ubicar servicios veterinarios.</p>
      </section>

      <div class="quick-grid">
        <button class="quick-card" data-action="reportLost"><span class="q-icon">${iconFor('lost')}</span><strong>Se perdió mi mascota</strong><small>Publica el aviso en menos de un minuto.</small></button>
        <button class="quick-card" data-action="reportFound"><span class="q-icon">${iconFor('found')}</span><strong>Encontré una mascota</strong><small>Ayuda a que vuelva con su familia.</small></button>
        <button class="quick-card" data-action="adopt"><span class="q-icon">${iconFor('adopt')}</span><strong>Quiero adoptar</strong><small>Conoce mascotas que buscan hogar.</small></button>
        <button class="quick-card" data-action="services"><span class="q-icon">${iconFor('service')}</span><strong>Veterinaria</strong><small>Encuentra atención y abre la ruta.</small></button>
      </div>

      <div class="notice">💡 <strong>Ahora los reportes son compartidos.</strong> Cuando Huellitas está conectada a la base de datos, lo que publiques se puede ver desde los demás celulares y los cambios se sincronizan automáticamente.</div>

      <div class="section-head"><div><h2>Mascotas que necesitan ayuda</h2><p>Reportes recientes.</p></div><button class="link-btn" data-route="lost">Ver todo</button></div>
      <div class="cards-grid">${lost.length ? lost.map(reportCard).join('') : emptyBlock('No hay reportes activos todavía.','Sé el primero en publicar uno.')}</div>

      <div class="section-head"><div><h2>Adopciones</h2><p>Algunas mascotas esperando una familia.</p></div><button class="link-btn" data-route="adopt">Ver todo</button></div>
      <div class="cards-grid">${adopt.map(adoptCard).join('')}</div>

      <div class="section-head"><div><h2>Huellitas</h2><p>${remoteEnabled ? 'Conectada y sincronizada.' : 'Modo local de prueba.'}</p></div></div>
      <div class="profile-box">
        <div class="stats">
          <div class="stat"><strong>${reports.length}</strong><span>activos</span></div>
          <div class="stat"><strong>${adoptionPets.length}</strong><span>en adopción</span></div>
          <div class="stat"><strong>${services.length}</strong><span>servicios</span></div>
        </div>
      </div>`;
    bindDynamic();
  }

  function emptyBlock(title, body){ return `<div class="empty" style="grid-column:1/-1"><strong>${esc(title)}</strong>${esc(body)}</div>`; }

  function reportCard(r){
    const isLost = r.type === 'lost';
    const owner = remoteEnabled && currentUser && r.user_id === currentUser.id;
    return `<article class="pet-card">
      <img src="${esc(r.photo_url || r.photo || placeholderImage())}" alt="Foto de ${esc(r.name)}" onerror="this.src='${placeholderImage()}'">
      <div class="pet-body">
        <div class="pet-top"><div><h3 class="pet-name">${esc(r.name || 'Sin nombre')}</h3><div class="pet-meta">${esc(r.species)} · ${esc(r.district)}</div></div><span class="badge ${isLost?'danger':'success'}">${isLost?'Perdida':'Encontrada'}</span></div>
        <div class="pet-meta">${fmtDate(r.date)}${owner ? ' · Tu publicación' : ''}</div>
        <div class="card-actions"><button class="secondary-btn" data-action="viewReport" data-id="${esc(r.id)}">Ver</button><button class="primary-btn" data-action="shareReport" data-id="${esc(r.id)}">Compartir</button></div>
      </div>
    </article>`;
  }

  function adoptCard(p){
    return `<article class="pet-card"><img src="${esc(p.photo)}" alt="Foto de ${esc(p.name)}" onerror="this.src='${placeholderImage()}'"><div class="pet-body"><div class="pet-top"><div><h3 class="pet-name">${esc(p.name)}</h3><div class="pet-meta">${esc(p.species)} · ${esc(p.age)}</div></div><span class="badge">Adopción</span></div><div class="pet-meta">${esc(p.district)} · ${esc(p.size)}</div><div class="card-actions"><button class="primary-btn" data-action="viewAdopt" data-id="${esc(p.id)}">Conocer</button></div></div></article>`;
  }

  function renderLost(){
    main.innerHTML = `<section><div class="section-head"><div><h2>Mascotas perdidas y encontradas</h2><p>Lo que se publica aquí se comparte con los demás usuarios cuando la base está conectada.</p></div></div>
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
    main.innerHTML = `<div class="adoption-banner"><strong>Adopta con calma y responsabilidad 🐾</strong><p>Conoce a la mascota, revisa su información y envía tu solicitud. La adopción final la coordina la organización que la tiene a cargo.</p></div><div class="filters"><input id="adoptSearch" placeholder="Buscar por nombre o distrito…" aria-label="Buscar adopciones"><select id="adoptSpecies"><option value="all">Todas las especies</option><option value="Perro">Perros</option><option value="Gato">Gatos</option></select><select id="adoptSize"><option value="all">Todos los tamaños</option><option value="Pequeño">Pequeños</option><option value="Mediano">Medianos</option></select></div><div id="adoptList" class="cards-grid"></div>`;
    const update = () => {
      const q = document.getElementById('adoptSearch').value.toLowerCase().trim();
      const species = document.getElementById('adoptSpecies').value;
      const size = document.getElementById('adoptSize').value;
      const all = adoptionPets.filter(p => (species==='all'||p.species===species)&&(size==='all'||p.size===size)&&(`${p.name} ${p.district} ${p.description}`.toLowerCase().includes(q)));
      document.getElementById('adoptList').innerHTML = all.length ? all.map(adoptCard).join('') : emptyBlock('No encontramos mascotas.','Prueba otro filtro.');
      bindDynamic();
    };
    ['adoptSearch','adoptSpecies','adoptSize'].forEach(id=>document.getElementById(id).addEventListener(id==='adoptSearch'?'input':'change',update));
    update();
  }

  function renderServices(){
    main.innerHTML = `<section><div class="section-head"><div><h2>Veterinarias y servicios</h2><p>Ubica atención para tu mascota sin buscar en varias apps.</p></div></div><div class="notice">⚠️ Los horarios mostrados pertenecen a la demo. Para emergencias, confirma por teléfono antes de acudir.</div><div class="filters"><input id="serviceSearch" placeholder="Buscar distrito o veterinaria…" aria-label="Buscar servicios"><select id="serviceType"><option value="all">Todos</option><option value="Emergencias">Emergencias</option><option value="Veterinaria">Veterinaria</option></select></div><div id="serviceList" class="cards-grid"></div></section>`;
    const update = () => {
      const q = document.getElementById('serviceSearch').value.toLowerCase().trim();
      const type = document.getElementById('serviceType').value;
      const all = services.filter(s=>(type==='all'||s.type===type)&&(`${s.name} ${s.district} ${s.address}`.toLowerCase().includes(q)));
      document.getElementById('serviceList').innerHTML = all.map(serviceCard).join('');
      bindDynamic();
    };
    ['serviceSearch','serviceType'].forEach(id=>document.getElementById(id).addEventListener(id==='serviceSearch'?'input':'change',update));
    update();
  }

  function renderMyReports(){
    const mine = remoteEnabled && currentUser ? reportsCache.filter(r => r.user_id === currentUser.id) : localReports().filter(r => !r.demo);
    const activeMine = mine.filter(r => r.status !== 'resolved');
    const resolvedMine = mine.filter(r => r.status === 'resolved');
    main.innerHTML = `<section>
      <div class="section-head"><div><h2>Mis publicaciones</h2><p>Aquí controlas los reportes que hiciste desde este dispositivo.</p></div><button class="primary-btn" data-action="reportLost">＋ Publicar</button></div>
      ${mine.length ? `<div class="cards-grid">${mine.map(myReportCard).join('')}</div>` : emptyBlock('Todavía no has publicado nada.','Usa “Reportar” para crear tu primer aviso.')}
      ${resolvedMine.length ? `<div class="section-head"><div><h2>Casos resueltos</h2><p>Estos ya no aparecen en la búsqueda pública activa.</p></div></div><div class="cards-grid">${resolvedMine.map(myReportCard).join('')}</div>` : ''}
    </section>`;
    bindDynamic();
  }

  function myReportCard(r){
    const resolved = r.status === 'resolved';
    return `<article class="pet-card ${resolved?'muted-card':''}"><img src="${esc(r.photo_url || r.photo || placeholderImage())}" alt="Foto de ${esc(r.name)}" onerror="this.src='${placeholderImage()}'"><div class="pet-body"><div class="pet-top"><div><h3 class="pet-name">${esc(r.name || 'Sin nombre')}</h3><div class="pet-meta">${esc(r.species)} · ${esc(r.district)}</div></div><span class="badge ${resolved?'':'danger'}">${resolved?'Resuelta':(r.type==='lost'?'Perdida':'Encontrada')}</span></div><div class="pet-meta">Publicado ${fmtDate(r.date)}</div><div class="card-actions"><button class="secondary-btn" data-action="viewReport" data-id="${esc(r.id)}">Ver</button>${resolved?'':'<button class="primary-btn" data-action="resolveReport" data-id="'+esc(r.id)+'">'+(r.type==='lost'?'Ya la encontré':'Ya entregué a su familia')+'</button>'}<button class="danger-btn" data-action="deleteReport" data-id="${esc(r.id)}">Eliminar</button></div></div></article>`;
  }

  function renderSettings(){
    const settings = getSettings();
    main.innerHTML = `<section>
      <div class="section-head"><div><h2>Configuración</h2><p>Opciones básicas de Huellitas.</p></div></div>
      <div class="settings-list">
        <div class="setting-item"><div><strong>Estado de sincronización</strong><p>${remoteEnabled ? 'Conectada a la base compartida. Los cambios se sincronizan entre celulares.' : 'Modo local de prueba. Para compartir publicaciones entre celulares conecta Supabase.'}</p></div><span class="status-pill ${remoteEnabled?'ok':'warn'}">${remoteEnabled?'Conectada':'Modo local'}</span></div>
        <div class="setting-item"><div><strong>Tema</strong><p>Elige cómo quieres ver Huellitas.</p></div><select id="themeSelect" class="compact-select"><option value="light" ${settings.theme==='light'?'selected':''}>Claro</option><option value="dark" ${settings.theme==='dark'?'selected':''}>Oscuro</option></select></div>
        <div class="setting-item"><div><strong>Mis publicaciones</strong><p>Resuelve o elimina avisos que publicaste.</p></div><button class="secondary-btn" data-action="myReports">Abrir</button></div>
        <div class="setting-item"><div><strong>Instalar Huellitas</strong><p>Agrega Huellitas a la pantalla de inicio del celular.</p></div><button class="secondary-btn" data-action="installHelp">Cómo hacerlo</button></div>
        <div class="setting-item"><div><strong>Actualizar datos</strong><p>Vuelve a consultar la base compartida.</p></div><button class="secondary-btn" data-action="refreshReports">Actualizar</button></div>
        <div class="setting-item"><div><strong>Privacidad</strong><p>Huellitas usa un usuario anónimo del dispositivo para saber qué publicaciones puedes gestionar. No mostramos ese identificador a otros usuarios.</p></div><span class="small-note">Sin contraseña</span></div>
        <div class="setting-item"><div><strong>Modo de prueba local</strong><p>Solo se usa como respaldo si Supabase aún no está conectado.</p></div><button class="danger-outline" data-action="clearLocal">Limpiar</button></div>
      </div>
    </section>`;
    document.getElementById('themeSelect').addEventListener('change', e=>{ settings.theme=e.target.value; saveSettings(settings); applyTheme(); });
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
        if(a==='resolveReport') await resolveReport(el.dataset.id);
        if(a==='deleteReport') await deleteReport(el.dataset.id);
        if(a==='myReports') navigate('my');
        if(a==='installHelp') showInstallHelp(true);
        if(a==='refreshReports') { await loadReports(); toast('Datos actualizados.'); if(currentRoute==='settings') renderSettings(); }
        if(a==='clearLocal') clearLocalData();
      };
    });
  }

  function openReportModal(type='lost'){
    const isFound = type==='found';
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>${isFound?'Encontré una mascota':'Reportar mascota perdida'}</h2><div style="color:var(--muted);font-size:12px;margin-top:3px">La publicación podrá verse desde otros celulares cuando Huellitas esté conectada.</div></div><button class="close-btn" id="closeModal">×</button></div>
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
      const data = await compressImage(photoInput.files[0]);
      const preview = document.getElementById('photoPreview'); preview.style.display='block'; preview.querySelector('img').src=data.dataUrl; photoInput.dataset.data=data.dataUrl; photoInput._blob=data.blob;
    });
    document.getElementById('reportForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const submitBtn = e.currentTarget.querySelector('button[type="submit"]'); submitBtn.disabled=true; submitBtn.textContent='Publicando…';
      const fd = new FormData(e.currentTarget);
      const report = {id:crypto.randomUUID ? crypto.randomUUID() : `u-${Date.now()}`,type:fd.get('type'),name:fd.get('name'),species:fd.get('species'),district:fd.get('district'),date:fd.get('date'),contact:fd.get('contact'),description:fd.get('description'),status:'active',created_at:new Date().toISOString()};
      try{
        await publishReport(report, photoInput._blob || null, photoInput.dataset.data || '');
        closeModal(); toast(remoteEnabled ? 'Reporte publicado para todos los usuarios.' : 'Reporte publicado en este dispositivo. Conecta Supabase para compartirlo.'); navigate('lost');
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
      const row = {user_id:currentUser.id,type:report.type,name:report.name,species:report.species,district:report.district,date:report.date,contact:report.contact,description:report.description,photo_url:photoUrl,status:'active'};
      const {data,error} = await supabaseClient.from('reports').insert(row).select().single();
      if(error) throw error;
      reportsCache = [data, ...reportsCache];
      return;
    }
    const reports = localReports().filter(r=>!r.demo);
    reports.unshift({...report,photo:localDataUrl || placeholderImage(),demo:false});
    setLocalReports(reports);
    reportsCache = [...sampleReports,...reports];
  }

  function openReportDetails(id){
    const r = reportsCache.find(x=>x.id===id); if(!r) return;
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.district+', Lima, Perú')}`;
    const owner = remoteEnabled && currentUser && r.user_id === currentUser.id;
    const actions = `${r.status==='resolved' ? '' : (owner ? `<button class="primary-btn" id="resolveOwnReport">${r.type==='lost'?'Ya la encontré':'Ya entregué a su familia'}</button>` : '')}<button class="secondary-btn" id="closeReportDetail">Cerrar</button>${owner?'<button class="danger-btn" id="deleteOwnReport">Eliminar</button>':''}`;
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><h2>${esc(r.name||'Sin nombre')}</h2><button class="close-btn" id="closeModal">×</button></div><img class="detail-hero" src="${esc(r.photo_url||r.photo||placeholderImage())}" alt="Foto de ${esc(r.name)}" onerror="this.src='${placeholderImage()}'"><div class="pet-top"><div><span class="badge ${r.status==='resolved'?'':' '+(r.type==='lost'?'danger':'success')}">${r.status==='resolved'?'Caso resuelto':(r.type==='lost'?'Mascota perdida':'Mascota encontrada')}</span></div></div><div class="info-list"><div class="info-item"><strong>Especie</strong><span>${esc(r.species)}</span></div><div class="info-item"><strong>Zona</strong><span>${esc(r.district)}</span></div><div class="info-item"><strong>Fecha</strong><span>${fmtDate(r.date)}</span></div><div class="info-item"><strong>Descripción</strong><span>${esc(r.description)}</span></div><div class="info-item"><strong>Contacto</strong><span>${esc(r.contact)}</span></div></div><div class="modal-footer"><a class="secondary-btn" style="text-decoration:none;text-align:center" href="https://wa.me/${r.contact.replace(/\D/g,'')}" target="_blank" rel="noopener">WhatsApp</a><a class="primary-btn" style="text-decoration:none;text-align:center" href="${maps}" target="_blank" rel="noopener">Ver zona</a></div><div class="modal-footer">${actions}</div></div></div>`;
    document.getElementById('closeModal').onclick = closeModal;
    const resolveBtn=document.getElementById('resolveOwnReport'); if(resolveBtn) resolveBtn.onclick=async()=>{closeModal(); await resolveReport(id);};
    const delBtn=document.getElementById('deleteOwnReport'); if(delBtn) delBtn.onclick=async()=>{closeModal(); await deleteReport(id);};
    document.getElementById('closeReportDetail').onclick=closeModal;
  }

  async function resolveReport(id){
    if(!canManage(id)) { toast('Solo quien publicó el aviso puede cerrarlo.'); return; }
    if(!confirm('¿Confirmas que este caso ya se resolvió? Dejará de aparecer entre las publicaciones activas.')) return;
    if(remoteEnabled){
      const {error}=await supabaseClient.from('reports').update({status:'resolved',updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',currentUser.id);
      if(error){toast(errorText(error,'No se pudo actualizar.'));return;}
      toast('Caso resuelto. Se quitó de la búsqueda activa para todos.');
      await loadReports();
    } else {
      const data=localReports().map(r=>r.id===id?{...r,status:'resolved'}:r); setLocalReports(data); reportsCache=[...sampleReports,...data]; toast('Caso resuelto en este dispositivo.');
    }
    navigate('my');
  }

  async function deleteReport(id){
    if(!canManage(id)) { toast('Solo puedes eliminar tus propias publicaciones.'); return; }
    if(!confirm('¿Eliminar esta publicación? Se quitará para todos los usuarios y no se puede deshacer.')) return;
    const r=reportsCache.find(x=>x.id===id);
    if(remoteEnabled){
      const {error}=await supabaseClient.from('reports').delete().eq('id',id).eq('user_id',currentUser.id);
      if(error){toast(errorText(error,'No se pudo eliminar.'));return;}
      if(r?.photo_url) await tryDeletePhoto(r.photo_url);
      toast('Publicación eliminada para todos los usuarios.');
      await loadReports();
    } else {
      const data=localReports().filter(x=>x.id!==id); setLocalReports(data); reportsCache=[...sampleReports,...data]; toast('Publicación eliminada de este dispositivo.');
    }
    navigate('my');
  }

  function canManage(id){ return Boolean(remoteEnabled && currentUser && reportsCache.find(r=>r.id===id)?.user_id===currentUser.id) || (!remoteEnabled && localReports().some(r=>r.id===id && !r.demo)); }

  async function tryDeletePhoto(url){
    try{
      const marker='/report-photos/'; const idx=url.indexOf(marker); if(idx<0) return; const path=url.slice(idx+marker.length); await supabaseClient.storage.from('report-photos').remove([path]);
    }catch{}
  }

  async function shareReport(id){
    const r=reportsCache.find(x=>x.id===id); if(!r) return;
    const text=`🐾 Huellitas — ${r.type==='lost'?'Mascota perdida':'Mascota encontrada'}\n${r.name || 'Sin nombre'} · ${r.species}\nZona: ${r.district}\n${r.description}\nContacto: ${r.contact}\n\n${location.href}`;
    try{ if(navigator.share){ await navigator.share({title:'Huellitas',text}); toast('Reporte compartido.'); } else { await navigator.clipboard.writeText(text); toast('Información copiada para compartirla.'); } }catch{}
  }

  function openAdoptionDetails(id){
    const p = adoptionPets.find(x=>x.id===id); if(!p) return;
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><h2>${esc(p.name)}</h2><button class="close-btn" id="closeModal">×</button></div><img class="detail-hero" src="${esc(p.photo)}" alt="Foto de ${esc(p.name)}" onerror="this.src='${placeholderImage()}'"><div class="info-list"><div class="info-item"><strong>Especie</strong><span>${esc(p.species)}</span></div><div class="info-item"><strong>Edad</strong><span>${esc(p.age)}</span></div><div class="info-item"><strong>Tamaño</strong><span>${esc(p.size)}</span></div><div class="info-item"><strong>Distrito</strong><span>${esc(p.district)}</span></div><div class="info-item"><strong>Descripción</strong><span>${esc(p.description)}</span></div><div class="info-item"><strong>Organización</strong><span>${esc(p.org)}</span></div></div><div class="modal-footer"><button class="secondary-btn" id="closeAdopt">Cerrar</button><button class="primary-btn" id="applyAdopt">Quiero adoptar</button></div></div></div>`;
    document.getElementById('closeModal').onclick=closeModal; document.getElementById('closeAdopt').onclick=closeModal; document.getElementById('applyAdopt').onclick=()=>openAdoptionForm(p);
  }

  function openAdoptionForm(p){
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>Solicitud para ${esc(p.name)}</h2><div style="font-size:12px;color:var(--muted)">La organización recibirá los datos para continuar el proceso.</div></div><button class="close-btn" id="closeModal">×</button></div><form id="adoptionForm"><div class="form-grid"><div class="field"><label>Nombre</label><input name="name" required placeholder="Tu nombre"></div><div class="field"><label>Teléfono / WhatsApp</label><input name="phone" required inputmode="tel" placeholder="999 999 999"></div><div class="field full"><label>¿Por qué quieres adoptar?</label><textarea name="reason" required placeholder="Cuéntanos brevemente sobre tu hogar y disponibilidad."></textarea></div></div><div class="modal-footer"><button type="button" class="secondary-btn" id="cancelModal">Cancelar</button><button class="primary-btn" type="submit">Enviar solicitud</button></div></form></div></div>`;
    document.getElementById('closeModal').onclick=closeModal; document.getElementById('cancelModal').onclick=closeModal;
    document.getElementById('adoptionForm').addEventListener('submit', e=>{e.preventDefault(); let requests=[]; try{requests=JSON.parse(localStorage.getItem(STORAGE.adoption)||'[]')}catch{} requests.unshift({petId:p.id,pet:p.name,...Object.fromEntries(new FormData(e.currentTarget).entries()),createdAt:new Date().toISOString()}); localStorage.setItem(STORAGE.adoption,JSON.stringify(requests)); closeModal(); toast(`Solicitud para ${p.name} enviada.`);});
  }

  function closeModal(){ modalRoot.innerHTML=''; }
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
      if(error) throw error;
      reportsCache = data || [];
    } else reportsCache = [...sampleReports,...localReports().filter(r=>!r.demo)];
    if(currentRoute==='home') renderHome();
    if(currentRoute==='lost') renderLost();
    if(currentRoute==='my') renderMyReports();
  }

  async function initSupabase(){
    if(!hasSupabaseConfig) { remoteEnabled=false; reportsCache=[...sampleReports,...localReports()]; return; }
    try{
      supabaseClient = window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      let {data:{session}}=await supabaseClient.auth.getSession();
      if(!session){ const sign=await supabaseClient.auth.signInAnonymously(); if(sign.error) throw sign.error; session=sign.data.session; }
      currentUser=session?.user || null;
      if(!currentUser) throw new Error('No se pudo crear una sesión.');
      remoteEnabled=true;
      await loadReports();
      realtimeChannel = supabaseClient.channel('huellitas-reports')
        .on('postgres_changes',{event:'*',schema:'public',table:'reports'},async()=>{ try{ await loadReports(); if(currentRoute==='settings') renderSettings(); }catch{} })
        .subscribe();
    }catch(err){
      remoteEnabled=false;
      reportsCache=[...sampleReports,...localReports().filter(r=>!r.demo)];
      setTimeout(()=>toast('Supabase aún no está listo: la app está en modo local.'),700);
      console.warn('Huellitas backend:',err);
    }
  }

  function applyTheme(){ document.body.classList.toggle('dark-mode',getSettings().theme==='dark'); }
  function clearLocalData(){ if(!confirm('Esto borra solo datos guardados localmente en este navegador. No elimina reportes compartidos. ¿Continuar?')) return; localStorage.removeItem(STORAGE.reports); localStorage.removeItem(STORAGE.adoption); reportsCache=remoteEnabled?reportsCache:sampleReports; toast('Datos locales limpiados.'); renderSettings(); }
  function errorText(err,fallback){ return err?.message || fallback; }

  function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isStandalone(){ return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true; }
  function showInstallHelp(force=false){
    if(isStandalone() && !force) return;
    const ios=isIOS();
    installHelp.innerHTML=`<h3>Instala Huellitas en tu celular</h3>${ios?'<p>En iPhone: abre Huellitas en Safari, pulsa <strong>Compartir</strong>, elige <strong>Añadir a pantalla de inicio</strong> y activa <strong>Abrir como app web</strong>.</p>':'<p>En Android: abre Huellitas en Chrome y pulsa <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p>'}<div class="help-actions"><button class="secondary-btn" id="closeInstallHelp">Cerrar</button><button class="primary-btn" id="installHelpBtn">Instalar</button></div>`;
    installHelp.hidden=false; installHelp.classList.add('show');
    document.getElementById('closeInstallHelp').onclick=()=>{installHelp.classList.remove('show');installHelp.hidden=true;};
    document.getElementById('installHelpBtn').onclick=async()=>{ installHelp.classList.remove('show'); installHelp.hidden=true; if(deferredInstall){deferredInstall.prompt(); try{await deferredInstall.userChoice;}catch{} deferredInstall=null; installBtn.hidden=true;} else if(!isIOS()) toast('Usa el menú del navegador para elegir “Instalar aplicación”.'); };
  }

  document.addEventListener('click',e=>{ const routeEl=e.target.closest('[data-route]'); if(routeEl){e.preventDefault();navigate(routeEl.dataset.route);} });
  navItems.forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.route)));
  document.getElementById('reportBtn').addEventListener('click',()=>openReportModal('lost'));
  document.getElementById('settingsBtn').addEventListener('click',()=>navigate('settings'));
  window.addEventListener('beforeinstallprompt', e=>{e.preventDefault();deferredInstall=e;installBtn.hidden=false;});
  installBtn.addEventListener('click',async()=>{if(!deferredInstall){showInstallHelp(true);return;} deferredInstall.prompt(); try{await deferredInstall.userChoice;}catch{} deferredInstall=null;installBtn.hidden=true;});
  window.addEventListener('appinstalled',()=>{installBtn.hidden=true;toast('Huellitas ya está instalada en tu celular.');});
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});

  async function boot(){
    applyTheme();
    await initSupabase();
    if(!reportsCache.length) reportsCache=[...sampleReports,...localReports()];
    renderHome();
  }
  boot();
})();
