// Подставляем данные вашего проекта Supabase
const SUPABASE_URL = 'ВАШ_PROJECT_URL';
const SUPABASE_ANON_KEY = 'ВАШ_ANON_KEY';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let authMode = 'create'; // 'create' или 'join'

function switchTab(mode) {
  authMode = mode;
  const createBtn = document.getElementById('tab-create');
  const joinBtn = document.getElementById('tab-join');
  const authBtn = document.getElementById('auth-btn');
  const inviteInput = document.getElementById('invite-code');

  if (mode === 'create') {
    createBtn.classList.add('active');
    joinBtn.classList.remove('active');
    authBtn.textContent = 'Создать пару';
    inviteInput.classList.add('hidden');
  } else {
    joinBtn.classList.add('active');
    createBtn.classList.remove('active');
    authBtn.textContent = 'Присоединиться';
    inviteInput.classList.remove('hidden');
  }
}

async function handleAuth() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const inviteCodeInput = document.getElementById('invite-code').value.trim();
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Заполните email и пароль!';
    return;
  }

  try {
    if (authMode === 'create') {
      // 1. Регистрируем пользователя
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      
      const userId = signUpData.user.id;

      // 2. Генерируем случайный 6-значный инвайт-код
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 3. Создаем запись в таблице couples
      const { error: coupleError } = await supabaseClient
        .from('couples')
        .insert([{ user1_id: userId, invite_code: newCode }]);

      if (coupleError) throw coupleError;

      // Показываем код пользователю
      document.getElementById('auth-screen').classList.add('hidden');
      const codeResult = document.getElementById('code-result');
      codeResult.classList.remove('hidden');
      codeResult.innerHTML = `<p>Ваш код приглашения:</p><h3>${newCode}</h3><p style="font-size:12px; color:#666;">Отправьте его парню, чтобы он ввел его при входе!</p>`;

    } else {
      // Режим входа по инвайт-коду
      if (!inviteCodeInput) {
        errorEl.textContent = 'Введите код приглашения!';
        return;
      }

      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const userId = signInData.user.id;

      // Ищем пару с таким кодом
      const { data: coupleData, error: coupleQueryError } = await supabaseClient
        .from('couples')
        .select('*')
        .eq('invite_code', inviteCodeInput)
        .single();

      if (coupleQueryError || !coupleData) {
        throw new Error('Пара с таким кодом не найдена');
      }

      // Привязываем второго пользователя
      const { error: updateError } = await supabaseClient
        .from('couples')
        .update({ user2_id: userId })
        .eq('id', coupleData.id);

      if (updateError) throw updateError;

      checkUserSession();
    }
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

async function handleLoginOnly() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorEl = document.getElementById('auth-error');
  
  if (!email || !password) {
    errorEl.textContent = 'Введите email и пароль для входа!';
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = error.message;
  } else {
    checkUserSession();
  }
}

async function checkUserSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
  }
}

async function signOut() {
  await supabaseClient.auth.signOut();
  location.reload();
}

checkUserSession();
