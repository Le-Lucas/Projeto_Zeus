// 1. IMPORTAÇÕES E CONFIGURAÇÃO
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBpyI6-fn-w4IniDlVI0A1xEzyGn__iOTQ",
    authDomain: "projeto-zeus-a2f3e.firebaseapp.com",
    projectId: "projeto-zeus-a2f3e",
    storageBucket: "projeto-zeus-a2f3e.firebasestorage.app",
    messagingSenderId: "869815347699",
    appId: "1:869815347699:web:492f6278f9a7dde1858a86"
};

const app = initializeApp(firebaseConfig);
const fs = getFirestore(app);
const docRef = doc(fs, "sistema", "zeus_v15_data");

// 2. ESTADO GLOBAL
window.db = { cronica: [], personagens: [], projeto_zeus: [], figuras: [], resistencia: [] };
window.currentCat = 'cronica';
window.editingIdx = null;

// 3. PERSISTÊNCIA
onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Garantir que as categorias existam (Dica 3)
        window.db = {
            cronica: data.cronica || [],
            personagens: data.personagens || [],
            projeto_zeus: data.projeto_zeus || [],
            figuras: data.figuras || [],
            resistencia: data.resistencia || []
        };
        render();
    }
});

async function persist() { 
    try {
        await setDoc(docRef, window.db); 
    } catch (e) {
        console.error("Erro ao persistir dados:", e);
        throw e;
    }
}

// 4. FUNÇÕES DE LÓGICA
function toggleSidebar() { 
    document.getElementById('sidebar')?.classList.toggle('active');
}

function openAddModal(idx = null) {
    // RESET de segurança (Dica 4)
    window.editingIdx = idx;
    
    const b = document.getElementById('modalBody');
    if(!b) return;
    
    // Optional Chaining (Dica 2)
    const item = idx !== null ? window.db[window.currentCat]?.[idx] : null;

    if (window.currentCat === 'personagens') {
        b.innerHTML = `
            <h3 class="neon-label">[ DNA_PERSONAGEM ]</h3>
            <input type="text" id="cName" placeholder="NOME" value="${item?.name || ''}">
            <input type="text" id="cImg" placeholder="URL_AVATAR" value="${item?.img || ''}">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.6rem;">
            <div>
              <h5 class="neon-label">FÍSICOS</h5>
              <div class="modal-stat-row">FOR ${generateDotInput('for','cFor', item?.phys?.For)}</div>
              <div class="modal-stat-row">DES ${generateDotInput('des','cDes', item?.phys?.Des)}</div>
              <div class="modal-stat-row">VIG ${generateDotInput('vig','cVig', item?.phys?.Vig)}</div>
          
              <h5 class="neon-label" style="margin-top:10px;">SOCIAIS</h5>
              <div class="modal-stat-row">CAR ${generateDotInput('car','cCar', item?.soc?.Car)}</div>
              <div class="modal-stat-row">MAN ${generateDotInput('man','cMan', item?.soc?.Man)}</div>
              <div class="modal-stat-row">APA ${generateDotInput('apa','cApa', item?.soc?.Apa)}</div>
            </div>
          
            <div>
              <h5 class="neon-label">MENTAIS</h5>
              <div class="modal-stat-row">INT ${generateDotInput('int','cInt', item?.ment?.Int)}</div>
              <div class="modal-stat-row">RAC ${generateDotInput('rac','cRac', item?.ment?.Rac)}</div>
              <div class="modal-stat-row">PER ${generateDotInput('per','cPer', item?.ment?.Per)}</div>
          
              <h5 class="neon-label" style="margin-top:10px;">VIRTUAIS</h5>
              <div class="modal-stat-row">COR ${generateDotInput('cor','vCor', item?.virt?.Cor)}</div>
              <div class="modal-stat-row">AUT ${generateDotInput('aut','vAut', item?.virt?.Aut)}</div>
              <div class="modal-stat-row">CON ${generateDotInput('con','vCon', item?.virt?.Con)}</div>
            </div>
          </div>

            <h5 class="neon-label">PERÍCIAS</h5>
            <div id="skillsContainer" style="max-height:120px; overflow-y:auto; border:1px solid #222; padding:5px;"></div>
            <button class="cmd-btn" style="font-size:0.6rem; margin-top:5px;" id="btnAddNewSkill">+ NOVA PERÍCIA</button>
            <textarea id="cBio" rows="2" placeholder="BIO...">${item?.biografia || ''}</textarea>
            <button class="cmd-btn" id="btnSavePJ">SINCRONIZAR</button>
        `;
        if(item?.skills) item.skills.forEach(s => addNewSkill(s.n, s.v));
        
        document.getElementById('btnAddNewSkill')?.addEventListener('click', () => addNewSkill());
        document.getElementById('btnSavePJ')?.addEventListener('click', saveCharacter);
    } else {
        b.innerHTML = `
            <h3 class="neon-label">[ REGISTRO_${window.currentCat.toUpperCase()} ]</h3>
            <input type="text" id="gTitle" placeholder="TÍTULO" value="${item?.title || ''}">
            <input type="text" id="gImg" placeholder="URL_IMAGEM" value="${item?.img || ''}">
            <textarea id="gText" rows="5" placeholder="CONTEÚDO...">${item?.text || ''}</textarea>
            <button class="cmd-btn" id="btnSaveGeneral">SINCRONIZAR</button>
        `;
        document.getElementById('btnSaveGeneral')?.addEventListener('click', saveGeneral);
    }
    document.getElementById('ctxModal').style.display = 'flex';
}

// Sincronização Assíncrona com Feedback (Dica 1)
async function saveCharacter() {
    const btn = document.getElementById('btnSavePJ');
    if(!btn) return;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "SINCRONIZANDO...";

    try {
        const getV = (n) => parseInt(document.querySelector(`input[name="${n}"]:checked`)?.value || 1);
        const skillEntries = document.querySelectorAll('.skill-entry');
        const skills = Array.from(skillEntries).map(e => ({
            n: e.querySelector('.skill-name').value || '---',
            v: parseInt(e.querySelector('input[type="radio"]:checked')?.value || 1)
        }));

        const data = {
            name: document.getElementById('cName').value || 'NULO',
            img: document.getElementById('cImg').value || '',
            biografia: document.getElementById('cBio').value || '',
            phys: { For: getV('for'), Des: getV('des'), Vig: 3 },
            soc: { Car: getV('car'), Man: 3, Apa: 3 },
            ment: { Int: getV('int'), Rac: getV('rac'), Per: 3 },
            virt: { Cor: getV('cor'), Aut: 3, Con: 3 },
            vitals: { Hum: 7, Von: 5 },
            skills: skills
        };

        if (window.editingIdx !== null) window.db.personagens[window.editingIdx] = data;
        else window.db.personagens.push(data);

        await persist(); 
        document.getElementById('ctxModal').style.display = 'none';
    } catch (error) {
        console.error("Erro na Matrix:", error);
        alert("FALHA NA SINCRONIZAÇÃO: Verifique a conexão.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function saveGeneral() {
    const btn = document.getElementById('btnSaveGeneral');
    if(!btn) return;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "SINCRONIZANDO...";

    try {
        const data = { 
            title: document.getElementById('gTitle').value || 'SEM TÍTULO', 
            text: document.getElementById('gText').value || '', 
            img: document.getElementById('gImg').value || '',
            date: new Date().toLocaleDateString() 
        };
        if (window.editingIdx !== null) window.db[window.currentCat][window.editingIdx] = data;
        else window.db[window.currentCat].push(data);

        await persist(); 
        document.getElementById('ctxModal').style.display = 'none';
    } catch (error) {
        console.error("Erro na Matrix:", error);
        alert("FALHA NA SINCRONIZAÇÃO.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function addNewSkill(name = '', val = 1) {
    const container = document.getElementById('skillsContainer');
    if (!container) return;
    const id = Date.now() + Math.random();
    const div = document.createElement('div');
    div.className = 'skill-entry';
    div.style = "display:flex; gap:10px; margin-bottom:5px; align-items:center;";
    div.innerHTML = `
        <input type="text" class="skill-name" placeholder="PERÍCIA" value="${name}" style="flex:1; margin:0; padding:5px;">
        ${generateDotInput(`s_${id}`, `sv_${id}`, val)}
        <button class="btn-remove-skill" style="background:none; border:none; color:red; cursor:pointer;">✕</button>
    `;
    div.querySelector('.btn-remove-skill').onclick = () => div.remove();
    container.appendChild(div);
}

function openReadModal(item, isChar) {
    const content = document.getElementById('readFullText');
    const title = document.getElementById('readTitle');
    if(title) title.innerText = item?.name || item?.title || 'SEM NOME';
    const getDots = (n) => "●".repeat(n || 0) + "○".repeat(5 - (n || 0));

    if (isChar) {
    content.innerHTML = `
        <div style="display:grid; grid-template-columns: 120px 1fr; gap:20px; align-items:start;">

            <div>
                <img 
                    src="${item?.img || 'https://via.placeholder.com/120'}"
                    style="
                        width:120px;
                        height:160px;
                        object-fit:cover;
                        border:1px solid #800000;
                        box-shadow:0 0 15px rgba(255,0,0,0.3);
                    "
                />
            </div>

            <div>
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:20px; font-size:0.8rem;">
                    <div>
                        <h5 class="neon-label">ATRIBUTOS FÍSICOS</h5>
                        <div>FOR: ${getDots(item?.phys?.For)}</div>
                        <div>DES: ${getDots(item?.phys?.Des)}</div>
                        <div>VIG: ${getDots(item?.phys?.Vig)}</div>

                        <h5 class="neon-label" style="margin-top:15px;">ATRIBUTOS SOCIAIS</h5>
                        <div>CAR: ${getDots(item?.soc?.Car)}</div>
                        <div>MAN: ${getDots(item?.soc?.Man)}</div>
                        <div>APA: ${getDots(item?.soc?.Apa)}</div>
                    </div>

                    <div>
                        <h5 class="neon-label">ATRIBUTOS MENTAIS</h5>
                        <div>INT: ${getDots(item?.ment?.Int)}</div>
                        <div>RAC: ${getDots(item?.ment?.Rac)}</div>
                        <div>PER: ${getDots(item?.ment?.Per)}</div>

                        <h5 class="neon-label" style="margin-top:15px;">ATRIBUTOS VIRTUAIS</h5>
                        <div>COR: ${getDots(item?.virt?.Cor)}</div>
                        <div>AUT: ${getDots(item?.virt?.Aut)}</div>
                        <div>CON: ${getDots(item?.virt?.Con)}</div>
                    </div>
                </div>
            </div>
        </div>

        <h5 class="neon-label" style="margin-top:20px;">PERÍCIAS</h5>
        <div style="font-size:0.75rem; max-height:120px; overflow-y:auto; border:1px solid #222; padding:5px; background:#111;">
            ${
              item?.skills?.length
                ? item.skills.map(s => `<div>${s.n}: ${getDots(s.v)}</div>`).join('')
                : 'Nenhuma perícia cadastrada'
            }
        </div>

        <p style="margin-top:25px; border-top:1px solid #222; padding-top:15px; font-size:0.8rem; line-height:1.4;">
            ${item?.biografia || 'Sem biografia.'}
        </p>
    `;
}

    else {
        content.innerHTML = `
            ${item?.img ? `<img src="${item.img}" style="width:100%; margin-bottom:15px;" />` : ''}
            <p style="font-size: 0.9rem; line-height: 1.5;">${item?.text || ''}</p>
        `;
    }
    document.getElementById('readModal').style.display = 'flex';
}

function generateDotInput(name, idPrefix, currentVal = 1) {
    let html = `<div class="wod-dots-input">`;
    for(let i = 5; i >= 1; i--) {
        html += `<input type="radio" name="${name}" value="${i}" id="${idPrefix}${i}" ${i == currentVal ? 'checked' : ''}>
                 <label for="${idPrefix}${i}"></label>`;
    }
    return html + `</div>`;
}

function render() {
    const cronFeed = document.getElementById('chronicleFeed');
    const charFeed = document.getElementById('charFeed');
    
    // 1. Limpeza e Reset de Scroll
    if (cronFeed) cronFeed.innerHTML = '';
    if (charFeed) charFeed.innerHTML = '';
    window.scrollTo(0, 0);

    // 2. Definição da Categoria Atual
    const data = window.db[window.currentCat] || [];
    const isGrid = ['personagens', 'figuras', 'resistencia', 'projeto_zeus'].includes(window.currentCat);

    if (isGrid) {
        // MODO GRID (Personagens/Cards)
        if (charFeed) charFeed.style.display = 'grid';
        if (cronFeed) cronFeed.style.display = 'none';

        data.forEach((item, idx) => {
            const block = document.createElement('div');
            block.className = 'char-block';

            // Abre a visualização ao clicar no card
            block.onclick = () => openReadModal(item, window.currentCat === 'personagens');

            block.innerHTML = `
                <div class="char-controls">
                    <span class="btn-edit">✎</span>
                    <span class="btn-delete" style="color:red">✕</span>
                </div>
                <div class="img-container">
                    <img src="${item?.img || ''}" onerror="this.src='https://via.placeholder.com/150'">
                </div>
                <div class="char-name">
                    ${item?.name || item?.title || 'SEM NOME'}
                </div>
            `;

            // Botões de ação com stopPropagation para não abrir o modal sem querer
            block.querySelector('.btn-edit').onclick = (e) => { e.stopPropagation(); openAddModal(idx); };
            block.querySelector('.btn-delete').onclick = (e) => { e.stopPropagation(); deleteItem(idx); };

            charFeed?.appendChild(block);
        });

    } else {
        // MODO CARROSSEL (Crônicas/Documentos)
        if (charFeed) charFeed.style.display = 'none';
        if (cronFeed) cronFeed.style.display = 'flex';

        data.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'chronicle-card';

            const resumo = item?.text ? item.text.substring(0, 140) : '';

            card.innerHTML = `
                <div class="chronicle-actions">
                    <button class="ghost-btn btn-edit">EDITAR</button>
                    <button class="ghost-btn btn-delete">EXCLUIR</button>
                </div>
                <h4 class="chronicle-title">${item?.title || 'SEM TÍTULO'}</h4>
                <p class="chronicle-preview">
                    ${resumo}${resumo.length < (item?.text || '').length ? '...' : ''}
                </p>
                <button class="open-btn">ABRIR_ARQUIVO</button>
            `;

            card.querySelector('.open-btn').onclick = () => openReadModal(item, false);
            card.querySelector('.btn-edit').onclick = (e) => { e.stopPropagation(); openAddModal(idx); };
            card.querySelector('.btn-delete').onclick = (e) => { e.stopPropagation(); deleteItem(idx); };

            cronFeed?.appendChild(card);
        });
    }
}
function deleteItem(idx) {
    if (!confirm('Confirma exclusão?')) return;
    const cat = window.currentCat;
    window.db[cat].splice(idx, 1);
    persist(); render();
}

// 5. INICIALIZAÇÃO DE EVENTOS
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.menu-toggle')?.addEventListener('click', toggleSidebar);
    
    document.querySelectorAll('.sidebar-links div').forEach(el => {
        // Mapeamento manual para evitar problemas com onclick antigo
        const text = el.innerText.toUpperCase();
        let targetCat = '';
        if(text.includes('CRÔNICA')) targetCat = 'cronica';
        else if(text.includes('PERSONAGENS')) targetCat = 'personagens';
        else if(text.includes('PROJETO ZEUS')) targetCat = 'projeto_zeus';
        else if(text.includes('FIGURAS')) targetCat = 'figuras';
        else if(text.includes('RESISTÊNCIA')) targetCat = 'resistencia';

        if(targetCat) {
            el.addEventListener('click', () => {
                window.currentCat = targetCat;
                document.getElementById('displayTitle').innerText = targetCat.toUpperCase().replace('_', ' ');
                render();
                toggleSidebar();
            });
        }
    });

    document.querySelector('.add-trigger')?.addEventListener('click', () => openAddModal());

    document.getElementById('diceToggleBtn')?.addEventListener('click', () => {
        const c = document.getElementById('diceConsole');
        if(c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
    });

    document.querySelector('#diceConsole button')?.addEventListener('click', () => {
        const cube = document.getElementById('cube');
        const pool = parseInt(document.getElementById('dicePool').value);
        cube.classList.add('is-rolling');
        setTimeout(() => {
            cube.classList.remove('is-rolling');
            let r = []; for(let i=0; i<pool; i++) r.push(Math.floor(Math.random()*10)+1);
            cube.style.transform = `rotateX(${Math.random()*360}deg) rotateY(${Math.random()*360}deg)`;
            document.getElementById('diceResult').innerText = r.join(' ') + " | SUCESSOS: " + r.filter(x=>x>=6).length;
        }, 1000);
    });

    document.getElementById('radioSelector')?.addEventListener('change', (e) => {
        const s = {'PL1':'p_N6k2MCHfA','PL2':'Vp08_mZ_X_g','PL3':'R-S0m_93t_E','PL4':'NduT71sk_t8'};
        const v = e.target.value;
        if(window.player && v && s[v]) {
            window.player.loadVideoById(s[v]);
            window.player.playVideo();
            document.getElementById('radioStatus').innerText = "SINAL_ESTÁVEL: " + v;
        } else if(window.player) {
            window.player.stopVideo();
            document.getElementById('radioStatus').innerText = "SINAL_ESTÁVEL: OFF";
        }
    });
});
// FECHAR MODAL DE LEITURA
document.getElementById('closeReadModal')
  ?.addEventListener('click', () => {
      document.getElementById('readModal').style.display = 'none';
  });

// FECHAR MODAL AO CLICAR FORA (LEITURA)
document.getElementById('readModal')
  ?.addEventListener('click', () => {
      document.getElementById('readModal').style.display = 'none';
  });

document.querySelector('#readModal .modal-content')
  ?.addEventListener('click', e => e.stopPropagation());

// FECHAR MODAL DE EDIÇÃO AO CLICAR FORA
document.getElementById('ctxModal')
  ?.addEventListener('click', () => {
      document.getElementById('ctxModal').style.display = 'none';
  });

document.querySelector('#ctxModal .modal-content')
  ?.addEventListener('click', e => e.stopPropagation());


// YOUTUBE API
if(!document.getElementById('yt-api')){
    const t = document.createElement('script'); 
    t.id = 'yt-api'; 
    t.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(t);
}
window.onYouTubeIframeAPIReady = () => {
    window.player = new YT.Player('yt-player', {
        height: '1', width: '1', videoId: '',
        playerVars: { 'autoplay': 1, 'controls': 0, 'rel': 0, 'modestbranding': 1, 'mute': 1 }
    });
};
