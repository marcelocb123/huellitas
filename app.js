(() => {
  const STORAGE = {
    reports: 'huellitas_reports_v1',
    adoption: 'huellitas_adoption_v1'
  };

  const sampleReports = [
    {id:'r1',type:'lost',name:'Luna',species:'Perro',district:'Surco',date:'2026-09-17',description:'Hembra pequeña, color crema, collar rosado. Se perdió cerca del parque.',contact:'999 111 222',photo:'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80'},
    {id:'r2',type:'found',name:'Max',species:'Perro',district:'Miraflores',date:'2026-09-18',description:'Macho mediano, pelaje marrón y blanco. Encontrado caminando solo.',contact:'987 222 333',photo:'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80'},
    {id:'r3',type:'lost',name:'Michi',species:'Gato',district:'San Borja',date:'2026-09-14',description:'Gato negro con ojos amarillos. Muy dócil. Responde a Michi.',contact:'986 333 444',photo:'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80'},
    {id:'r4',type:'found',name:'Sin nombre',species:'Gato',district:'Barranco',date:'2026-09-19',description:'Gatita tricolor encontrada cerca del malecón.',contact:'985 444 555',photo:'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=900&q=80'}
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
    {id:'v1',name:'Veterinaria 24/7 Miraflores',type:'Emergencias',district:'Miraflores',hours:'24 horas',phone:'(01) 555-0101',address:'Av. Benavides, Miraflores, Lima',lat:-12.1266,lng:-77.0305},
    {id:'v2',name:'Clínica Vet San Borja',type:'Veterinaria',district:'San Borja',hours:'08:00–20:00',phone:'(01) 555-0102',address:'Av. Aviación, San Borja, Lima',lat:-12.1069,lng:-76.9981},
    {id:'v3',name:'Centro Veterinario Surco',type:'Veterinaria',district:'Surco',hours:'09:00–21:00',phone:'(01) 555-0103',address:'Av. Caminos del Inca, Surco, Lima',lat:-12.1312,lng:-76.9856},
    {id:'v4',name:'Veterinaria Barranco',type:'Veterinaria',district:'Barranco',hours:'09:00–19:00',phone:'(01) 555-0104',address:'Av. Grau, Barranco, Lima',lat:-12.1444,lng:-77.0211}
  ];

  const main = document.getElementById('main');
  const modalRoot = document.getElementById('modalRoot');
  const toastEl = document.getElementById('toast');
  const navItems = [...document.querySelectorAll('.nav-item')];
  let currentRoute = 'home';
  let deferredInstall = null;

  const getReports = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE.reports) || 'null');
      return Array.isArray(stored) ? [...stored, ...sampleReports.filter(s => !stored.some(x => x.id === s.id))] : sampleReports;
    } catch { return sampleReports; }
  };
  const setReports = (reports) => localStorage.setItem(STORAGE.reports, JSON.stringify(reports));

  const esc = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmtDate = (s) => {
    if (!s) return 'Fecha no indicada';
    const d = new Date(`${s}T00:00:00`);
    return new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',year:'numeric'}).format(d);
  };
  const iconFor = (kind) => ({lost:'⚠',found:'✓',adopt:'♥',service:'✚',report:'＋'}[kind] || '•');

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
  }

  function renderHome(){
    const reports = getReports();
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

      <div class="notice">💡 <strong>La idea de Huellitas:</strong> dejar de buscar en WhatsApp, Facebook e Instagram por separado y concentrar las ayudas esenciales en un solo lugar.</div>

      <div class="section-head"><div><h2>Mascotas que necesitan ayuda</h2><p>Reportes recientes.</p></div><button class="link-btn" data-route="lost">Ver todo</button></div>
      <div class="cards-grid">${lost.map(reportCard).join('')}</div>

      <div class="section-head"><div><h2>Adopciones</h2><p>Algunas mascotas esperando una familia.</p></div><button class="link-btn" data-route="adopt">Ver todo</button></div>
      <div class="cards-grid">${adopt.map(adoptCard).join('')}</div>

      <div class="section-head"><div><h2>Huellitas en números</h2><p>Datos de esta demo.</p></div></div>
      <div class="profile-box">
        <div class="stats">
          <div class="stat"><strong>${reports.length}</strong><span>reportes</span></div>
          <div class="stat"><strong>${adoptionPets.length}</strong><span>en adopción</span></div>
          <div class="stat"><strong>${services.length}</strong><span>servicios</span></div>
        </div>
      </div>
    `;
    bindDynamic();
  }

  function reportCard(r){
    const isLost = r.type === 'lost';
    return `<article class="pet-card">
      <img src="${esc(r.photo || placeholderImage())}" alt="Foto de ${esc(r.name)}" onerror="this.src='${placeholderImage()}'">
      <div class="pet-body">
        <div class="pet-top"><div><h3 class="pet-name">${esc(r.name || 'Sin nombre')}</h3><div class="pet-meta">${esc(r.species)} · ${esc(r.district)}</div></div><span class="badge ${isLost?'danger':'success'}">${isLost?'Perdida':'Encontrada'}</span></div>
        <div class="pet-meta">${fmtDate(r.date)}</div>
        <div class="card-actions"><button class="secondary-btn" data-action="viewReport" data-id="${esc(r.id)}">Ver</button><button class="primary-btn" data-action="shareReport" data-id="${esc(r.id)}">Compartir</button></div>
      </div>
    </article>`;
  }

  function adoptCard(p){
    return `<article class="pet-card">
      <img src="${esc(p.photo)}" alt="Foto de ${esc(p.name)}" onerror="this.src='${placeholderImage()}'">
      <div class="pet-body"><div class="pet-top"><div><h3 class="pet-name">${esc(p.name)}</h3><div class="pet-meta">${esc(p.species)} · ${esc(p.age)}</div></div><span class="badge">Adopción</span></div><div class="pet-meta">${esc(p.district)} · ${esc(p.size)}</div><div class="card-actions"><button class="primary-btn" data-action="viewAdopt" data-id="${esc(p.id)}">Conocer</button></div></div>
    </article>`;
  }

  function renderLost(){
    main.innerHTML = `
      <section><div class="section-head"><div><h2>Mascotas perdidas y encontradas</h2><p>La parte más importante: encontrar coincidencias rápido.</p></div></div>
      <div class="filters"><input id="reportSearch" placeholder="Buscar por nombre, distrito…" aria-label="Buscar reportes"><select id="reportType"><option value="all">Todos</option><option value="lost">Perdidas</option><option value="found">Encontradas</option></select><select id="reportSpecies"><option value="all">Todas las especies</option><option value="Perro">Perros</option><option value="Gato">Gatos</option></select></div>
      <div id="reportList" class="cards-grid"></div></section>`;
    const update = () => {
      const q = document.getElementById('reportSearch').value.toLowerCase().trim();
      const type = document.getElementById('reportType').value;
      const species = document.getElementById('reportSpecies').value;
      const all = getReports().filter(r => (type==='all'||r.type===type)&&(species==='all'||r.species===species)&&(`${r.name} ${r.district} ${r.description}`.toLowerCase().includes(q)));
      document.getElementById('reportList').innerHTML = all.length ? all.map(reportCard).join('') : `<div class="empty" style="grid-column:1/-1"><strong>No encontramos coincidencias.</strong>Prueba con otro distrito o especie.</div>`;
      bindDynamic();
    };
    ['reportSearch','reportType','reportSpecies'].forEach(id=>document.getElementById(id).addEventListener(id==='reportSearch'?'input':'change',update));
    update();
  }

  function renderAdopt(){
    main.innerHTML = `
      <div class="adoption-banner"><strong>Adopta con calma y responsabilidad 🐾</strong><p>Conoce a la mascota, revisa su información y envía tu solicitud. La adopción final la coordina la organización que la tiene a cargo.</p></div>
      <div class="filters"><input id="adoptSearch" placeholder="Buscar por nombre o distrito…" aria-label="Buscar adopciones"><select id="adoptSpecies"><option value="all">Todas las especies</option><option value="Perro">Perros</option><option value="Gato">Gatos</option></select><select id="adoptSize"><option value="all">Todos los tamaños</option><option value="Pequeño">Pequeños</option><option value="Mediano">Medianos</option></select></div>
      <div id="adoptList" class="cards-grid"></div>`;
    const update = () => {
      const q = document.getElementById('adoptSearch').value.toLowerCase().trim();
      const species = document.getElementById('adoptSpecies').value;
      const size = document.getElementById('adoptSize').value;
      const all = adoptionPets.filter(p => (species==='all'||p.species===species)&&(size==='all'||p.size===size)&&(`${p.name} ${p.district} ${p.description}`.toLowerCase().includes(q)));
      document.getElementById('adoptList').innerHTML = all.length ? all.map(adoptCard).join('') : `<div class="empty" style="grid-column:1/-1"><strong>No encontramos mascotas.</strong>Prueba otro filtro.</div>`;
      bindDynamic();
    };
    ['adoptSearch','adoptSpecies','adoptSize'].forEach(id=>document.getElementById(id).addEventListener(id==='adoptSearch'?'input':'change',update));
    update();
  }

  function renderServices(){
    main.innerHTML = `
      <section><div class="section-head"><div><h2>Veterinarias y servicios</h2><p>Ubica atención para tu mascota sin buscar en varias apps.</p></div></div>
      <div class="notice">⚠️ Los horarios mostrados pertenecen a la demo. Para emergencias, confirma por teléfono antes de acudir.</div>
      <div class="filters"><input id="serviceSearch" placeholder="Buscar distrito o veterinaria…" aria-label="Buscar servicios"><select id="serviceType"><option value="all">Todos</option><option value="Emergencias">Emergencias</option><option value="Veterinaria">Veterinaria</option></select></div>
      <div id="serviceList" class="cards-grid"></div></section>`;
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

  function serviceCard(s){
    const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`;
    return `<article class="service-card"><div class="service-icon">✚</div><h3>${esc(s.name)}</h3><p>${esc(s.type)} · ${esc(s.district)}</p><div class="service-details"><div class="detail-row">🕒 <span>${esc(s.hours)}</span></div><div class="detail-row">☎️ <span>${esc(s.phone)}</span></div><div class="detail-row">📍 <span>${esc(s.address)}</span></div></div><div class="service-actions"><a class="secondary-btn" style="text-decoration:none;text-align:center" href="tel:${esc(s.phone.replace(/[^0-9+]/g,''))}">Llamar</a><a class="primary-btn" style="text-decoration:none;text-align:center" target="_blank" rel="noopener" href="${maps}">Cómo llegar</a></div></article>`;
  }

  function bindDynamic(){
    document.querySelectorAll('[data-route]').forEach(el => el.onclick = () => navigate(el.dataset.route));
    document.querySelectorAll('[data-action]').forEach(el => {
      el.onclick = () => {
        const a = el.dataset.action;
        if(a==='reportLost') openReportModal('lost');
        if(a==='reportFound') openReportModal('found');
        if(a==='adopt') navigate('adopt');
        if(a==='services') navigate('services');
        if(a==='viewReport') openReportDetails(el.dataset.id);
        if(a==='shareReport') shareReport(el.dataset.id);
        if(a==='viewAdopt') openAdoptionDetails(el.dataset.id);
      };
    });
  }

  function openReportModal(type='lost'){
    const isFound = type==='found';
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>${isFound?'Encontré una mascota':'Reportar mascota perdida'}</h2><div style="color:var(--muted);font-size:12px;margin-top:3px">Completa lo esencial. No necesitas crear una cuenta.</div></div><button class="close-btn" id="closeModal">×</button></div>
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
      const preview = document.getElementById('photoPreview'); preview.style.display='block'; preview.querySelector('img').src=data; photoInput.dataset.data=data;
    });
    document.getElementById('reportForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const report = {id:`u-${Date.now()}`,type:fd.get('type'),name:fd.get('name'),species:fd.get('species'),district:fd.get('district'),date:fd.get('date'),contact:fd.get('contact'),description:fd.get('description'),photo:photoInput.dataset.data || placeholderImage(),createdAt:new Date().toISOString()};
      const reports = getReports().filter(r=>!sampleReports.some(s=>s.id===r.id));
      reports.unshift(report); setReports(reports);
      closeModal(); toast('Reporte publicado. Ya aparece en tu lista de Huellitas.'); navigate('lost');
    });
    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('cancelModal').onclick = closeModal;
    document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop') closeModal();});
  }

  function openReportDetails(id){
    const r = getReports().find(x=>x.id===id); if(!r) return;
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.district+', Lima, Perú')}`;
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><h2>${esc(r.name||'Sin nombre')}</h2><button class="close-btn" id="closeModal">×</button></div><img class="detail-hero" src="${esc(r.photo||placeholderImage())}" alt="Foto de ${esc(r.name)}" onerror="this.src='${placeholderImage()}'"><div class="pet-top"><div><span class="badge ${r.type==='lost'?'danger':'success'}">${r.type==='lost'?'Mascota perdida':'Mascota encontrada'}</span></div></div><div class="info-list"><div class="info-item"><strong>Especie</strong><span>${esc(r.species)}</span></div><div class="info-item"><strong>Zona</strong><span>${esc(r.district)}</span></div><div class="info-item"><strong>Fecha</strong><span>${fmtDate(r.date)}</span></div><div class="info-item"><strong>Descripción</strong><span>${esc(r.description)}</span></div><div class="info-item"><strong>Contacto</strong><span>${esc(r.contact)}</span></div></div><div class="modal-footer"><a class="secondary-btn" style="text-decoration:none;text-align:center" href="https://wa.me/${r.contact.replace(/\D/g,'')}" target="_blank" rel="noopener">WhatsApp</a><a class="primary-btn" style="text-decoration:none;text-align:center" href="${maps}" target="_blank" rel="noopener">Ver zona</a></div></div></div>`;
    document.getElementById('closeModal').onclick = closeModal;
  }

  function openAdoptionDetails(id){
    const p = adoptionPets.find(x=>x.id===id); if(!p) return;
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><h2>${esc(p.name)}</h2><button class="close-btn" id="closeModal">×</button></div><img class="detail-hero" src="${esc(p.photo)}" alt="Foto de ${esc(p.name)}" onerror="this.src='${placeholderImage()}'"><div class="info-list"><div class="info-item"><strong>Especie</strong><span>${esc(p.species)}</span></div><div class="info-item"><strong>Edad</strong><span>${esc(p.age)}</span></div><div class="info-item"><strong>Tamaño</strong><span>${esc(p.size)}</span></div><div class="info-item"><strong>Distrito</strong><span>${esc(p.district)}</span></div><div class="info-item"><strong>Descripción</strong><span>${esc(p.description)}</span></div><div class="info-item"><strong>Organización</strong><span>${esc(p.org)}</span></div></div><div class="modal-footer"><button class="secondary-btn" id="closeAdopt">Cerrar</button><button class="primary-btn" id="applyAdopt">Quiero adoptar</button></div></div></div>`;
    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('closeAdopt').onclick = closeModal;
    document.getElementById('applyAdopt').onclick = () => openAdoptionForm(p);
  }

  function openAdoptionForm(p){
    modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><div><h2>Solicitud para ${esc(p.name)}</h2><div style="font-size:12px;color:var(--muted)">La organización recibirá los datos para continuar el proceso.</div></div><button class="close-btn" id="closeModal">×</button></div><form id="adoptionForm"><div class="form-grid"><div class="field"><label>Nombre</label><input name="name" required placeholder="Tu nombre"></div><div class="field"><label>Teléfono / WhatsApp</label><input name="phone" required inputmode="tel" placeholder="999 999 999"></div><div class="field full"><label>¿Por qué quieres adoptar?</label><textarea name="reason" required placeholder="Cuéntanos brevemente sobre tu hogar y disponibilidad."></textarea></div></div><div class="modal-footer"><button type="button" class="secondary-btn" id="cancelModal">Cancelar</button><button class="primary-btn" type="submit">Enviar solicitud</button></div></form></div></div>`;
    document.getElementById('closeModal').onclick=closeModal; document.getElementById('cancelModal').onclick=closeModal;
    document.getElementById('adoptionForm').addEventListener('submit', e=>{
      e.preventDefault();
      let requests=[]; try{requests=JSON.parse(localStorage.getItem(STORAGE.adoption)||'[]')}catch{}
      requests.unshift({petId:p.id,pet:p.name,...Object.fromEntries(new FormData(e.currentTarget).entries()),createdAt:new Date().toISOString()});
      localStorage.setItem(STORAGE.adoption,JSON.stringify(requests)); closeModal(); toast(`Solicitud para ${p.name} enviada.`);
    });
  }

  async function shareReport(id){
    const r=getReports().find(x=>x.id===id); if(!r) return;
    const text=`🐾 Huellitas — ${r.type==='lost'?'Mascota perdida':'Mascota encontrada'}\n${r.name || 'Sin nombre'} · ${r.species}\nZona: ${r.district}\n${r.description}\nContacto: ${r.contact}`;
    try{
      if(navigator.share){ await navigator.share({title:'Huellitas',text}); toast('Reporte compartido.'); }
      else { await navigator.clipboard.writeText(text); toast('Información copiada para compartirla.'); }
    }catch{}
  }

  function closeModal(){ modalRoot.innerHTML=''; }
  function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>toastEl.classList.remove('show'),2500)}
  function placeholderImage(){return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#eef3fb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#1268e8" font-family="Arial" font-size="38">🐾 Huellitas</text></svg>`)}

  async function compressImage(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader(); reader.onload=()=>{
        const img=new Image(); img.onload=()=>{
          const max=1000, scale=Math.min(1,max/Math.max(img.width,img.height));
          const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
          const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg',.75));
        }; img.onerror=reject; img.src=reader.result;
      }; reader.onerror=reject; reader.readAsDataURL(file);
    });
  }

  document.addEventListener('click',e=>{
    const routeEl=e.target.closest('[data-route]'); if(routeEl) {e.preventDefault();navigate(routeEl.dataset.route);}
  });
  navItems.forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.route)));
  document.getElementById('reportBtn').addEventListener('click',()=>openReportModal('lost'));

  const installBtn = document.getElementById('installBtn');
  const installHelp = document.getElementById('installHelp');

  function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isStandalone(){ return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true; }

  function showInstallHelp(){
    if(isStandalone()) return;
    const ios = isIOS();
    installHelp.innerHTML = `
      <h3>Instala Huellitas en tu celular</h3>
      ${ios
        ? '<p>En iPhone: abre Huellitas en Safari, pulsa <strong>Compartir</strong>, elige <strong>Añadir a pantalla de inicio</strong> y activa <strong>Abrir como app web</strong>.</p>'
        : '<p>En Android: abre Huellitas en Chrome y pulsa <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p>'}
      <div class="help-actions"><button class="secondary-btn" id="closeInstallHelp">Ahora no</button><button class="primary-btn" id="installHelpBtn">Entendido</button></div>`;
    installHelp.hidden=false; installHelp.classList.add('show');
    document.getElementById('closeInstallHelp').onclick=()=>{installHelp.classList.remove('show');installHelp.hidden=true;};
    document.getElementById('installHelpBtn').onclick=async()=>{
      installHelp.classList.remove('show'); installHelp.hidden=true;
      if(deferredInstall){
        deferredInstall.prompt();
        try{ await deferredInstall.userChoice; }catch{}
        deferredInstall=null; installBtn.hidden=true;
      }
    };
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredInstall=e; installBtn.hidden=false;
  });
  installBtn.addEventListener('click', async () => {
    if(!deferredInstall){ showInstallHelp(); return; }
    deferredInstall.prompt();
    try{ await deferredInstall.userChoice; }catch{}
    deferredInstall=null; installBtn.hidden=true;
  });
  window.addEventListener('appinstalled', () => { installBtn.hidden=true; toast('Huellitas ya está instalada en tu celular.'); });

  if('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  renderHome();
})();
