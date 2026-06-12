export function applyPhoneMask(input: HTMLInputElement) {
  input.addEventListener('input', () => {
    let val = input.value.replace(/\D/g, '');
    if (val.length <= 3 && input.value.length < 7) {
      input.value = '';
      return;
    }
    if (!val.startsWith('380')) val = '380' + val;
    val = val.slice(0, 12);

    let masked = '+380 (';
    if (val.length > 3) masked += val.slice(3, 5);
    if (val.length > 5) masked += ') ' + val.slice(5, 8);
    if (val.length > 8) masked += '-' + val.slice(8, 10);
    if (val.length > 10) masked += '-' + val.slice(10, 12);

    input.value = masked;
  });

  input.addEventListener('focus', () => {
    if (!input.value) input.value = '+380 (';
  });
}

export function getRawPhone(masked: string): string {
  return masked.replace(/\D/g, '');
}
