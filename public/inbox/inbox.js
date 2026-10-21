(() => {
  'use strict';
  const $ = selector => document.querySelector(selector), api = '/api/inbox/';
  let messages = [], unreadOnly = false, authenticated = false, loading = false;
  const notice = text => { $('#notice').textContent = text; };
  const showLogin = () => { authenticated = false; messages = []; $('#messages').replaceChildren(); $('#inbox-panel').hidden = true; $('#login-panel').hidden = false; };
  async function request(body) {
    const response = await fetch(api, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok) { if (response.status === 401 && body?.action !== 'login') showLogin(); throw new Error(result.message || (response.status === 401 ? '로그인 후 메시지를 확인해 주세요.' : '연결을 확인한 뒤 다시 시도해 주세요.')); }
    return result;
  }
  function render() {
    $('#count').textContent = `전체 ${messages.length}개 · 안 읽은 메시지 ${messages.filter(note => note.status === 'unread').length}개`;
    const query = $('#search').value.trim().toLocaleLowerCase();
    const visible = messages.filter(note => (!unreadOnly || note.status === 'unread') && (!query || `${note.message} ${note.email || ''}`.toLocaleLowerCase().includes(query)));
    $('#messages').replaceChildren(); $('#empty').hidden = visible.length > 0; $('#empty').textContent = messages.length ? '조건에 맞는 메시지가 없어요.' : '아직 남겨진 메시지가 없어요.';
    for (const note of visible) {
      const row = document.createElement('tr');
      const stateCell = document.createElement('td'), dateCell = document.createElement('td'), messageCell = document.createElement('td'), replyCell = document.createElement('td');
      const state = document.createElement('button'); state.className = 'state'; state.dataset.unread = note.status === 'unread'; state.textContent = note.status === 'unread' ? '안 읽음' : '읽음';
      state.setAttribute('aria-label', `${note.status === 'unread' ? '읽음' : '안 읽음'}으로 표시: ${note.message.slice(0,30)}`);
      state.addEventListener('click', async () => { state.disabled = true; try { const status = note.status === 'unread' ? 'read' : 'unread'; await request({ action: 'status', id: note.id, status }); note.status = status; render(); notice('상태를 저장했어요.'); } catch (error) { notice(error.message); state.disabled = false; } });
      stateCell.append(state);
      const date = new Date(note.createdAt);
      dateCell.className = 'date'; dateCell.textContent = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) + '\n' + new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }).format(date);
      messageCell.className = 'message'; messageCell.textContent = note.message;
      if (note.email) { const reply = document.createElement('a'); reply.className = 'reply'; reply.textContent = note.email; reply.href = `mailto:${encodeURIComponent(note.email)}?subject=${encodeURIComponent('gwangil.xyz에 남겨주신 메시지에 답장드려요')}`; replyCell.append(reply); }
      else { replyCell.className = 'no-reply'; replyCell.textContent = '답장 주소 없음'; }
      row.append(stateCell, dateCell, messageCell, replyCell); $('#messages').append(row);
    }
  }
  async function load() {
    if (loading) return; loading = true; $('#refresh').disabled = true;
    try { const result = await request(); messages = result.messages; authenticated = true; $('#login-panel').hidden = true; $('#inbox-panel').hidden = false; render(); notice(''); }
    catch (error) { if (!authenticated) showLogin(); notice(error.message); }
    finally { loading = false; $('#refresh').disabled = false; }
  }
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.submitter; button.disabled = true; notice('메시지함을 열고 있어요.');
    try { await request({ action: 'login', password: $('#password').value }); $('#password').value = ''; await load(); } catch (error) { notice(error.message); } finally { button.disabled = false; }
  });
  $('#logout').addEventListener('click', async () => { $('#logout').disabled = true; try { await request({ action: 'logout' }); showLogin(); notice('로그아웃했어요.'); $('#password').focus(); } catch (error) { notice(error.message); } finally { $('#logout').disabled = false; } });
  $('#refresh').addEventListener('click', load);
  for (const [id, unread] of [['all', false], ['unread', true]]) $('#' + id).addEventListener('click', () => { unreadOnly = unread; $('#all').setAttribute('aria-pressed', !unread); $('#unread').setAttribute('aria-pressed', unread); render(); });
  $('#search').addEventListener('input', render);
  $('#export').addEventListener('click', async () => {
    $('#export').disabled = true;
    try { const response = await fetch(api + '?format=csv', { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(15000) }); if (!response.ok) { if (response.status === 401) showLogin(); throw new Error('로그인과 연결 상태를 확인해 주세요.'); }
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = 'gwangil-messages.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notice('CSV 파일을 다운로드했어요.');
    } catch (error) { notice(error.message); } finally { $('#export').disabled = false; }
  });
  window.addEventListener('pageshow', load);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && authenticated) load(); });
})();
