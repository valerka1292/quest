import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD || 'veilworlds-secure-' + Math.random().toString(36).substring(2, 12);
  const adminPassword = await bcrypt.hash(rawPassword, 10);

  if (!process.env.INITIAL_ADMIN_PASSWORD) {
    console.warn(`⚠️ Warning: INITIAL_ADMIN_PASSWORD not set. Generated temporary password: ${rawPassword}`);
  }

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPassword },
    create: {
      username: 'admin',
      passwordHash: adminPassword,
    },
  });

  await prisma.quest.upsert({
    where: { slug: 'silent-hill' },
    update: {
      heroImage: '/images/silent_hill.png',
      photos: [
        '/images/silent-hill/1.jpg', '/images/silent-hill/2.jpg', '/images/silent-hill/3.jpg',
        '/images/silent-hill/4.jpg', '/images/silent-hill/5.jpg', '/images/silent-hill/6.jpg',
        '/images/silent-hill/7.jpg', '/images/silent-hill/8.jpg', '/images/silent-hill/9.jpg',
        '/images/silent-hill/10.jpg',
        '/images/silent-hill/video.mp4',
      ],
      ageMin: 9,
      duration: 60,
      minPlayers: 2,
      maxPlayers: 8,
    },
    create: {
      slug: 'silent-hill',
      name: 'Silent Hill',
      subtitle: 'Туман не відпускає',
      tagline: 'Туман не відпускає всіх, хто заходить.',
      description: 'Пориньте у світ густого туману, де реальність переплітається з кошмаром. Silent Hill — це хоррор-квест із професійним актором, який проведе вас найстрашнішими вулицями покинутого міста. Кожен звук, кожна тінь тут мають значення. Чи зможете ви знайти вихід?',
      plotSummary: 'Місто Silent Hill оповите густим туманом. Ви отримуєте лист від зниклої людини з проханням про допомогу. Прибувши на місце, ви розумієте — місто не хоче вас відпускати. Розгадайте таємницю, поки туман не поглинув вас назавжди.',
      genre: 'Хоррор',
      ageMin: 9,
      duration: 60,
      minPlayers: 2,
      maxPlayers: 8,
      hasActor: true,
      hasRestZone: true,
      accentColor: '#DC2626',
      heroImage: '/images/silent_hill.png',
      photos: [
        '/images/silent-hill/1.jpg', '/images/silent-hill/2.jpg', '/images/silent-hill/3.jpg',
        '/images/silent-hill/4.jpg', '/images/silent-hill/5.jpg', '/images/silent-hill/6.jpg',
        '/images/silent-hill/7.jpg', '/images/silent-hill/8.jpg', '/images/silent-hill/9.jpg',
        '/images/silent-hill/10.jpg',
        '/images/silent-hill/video.mp4',
      ],
      rating: 4.8,
      reviewCount: 0,
      isActive: true,
    },
  });

  await prisma.quest.upsert({
    where: { slug: 'harry-potter' },
    update: {
      heroImage: '/images/harry.png',
      photos: [
        '/images/harry-potter/1.jpg',
        '/images/harry-potter/2.jpg',
        '/images/harry-potter/3.jpg',
        '/images/harry-potter/4.jpg',
        '/images/harry-potter/5.jpg',
        '/images/harry-potter/6.jpg',
        '/images/harry-potter/7.jpg',
        '/images/harry-potter/8.jpg',
        '/images/harry-potter/9.jpg',
        '/images/harry-potter/10.jpg',
        '/images/harry-potter/11.jpg',
        '/images/harry-potter/12.jpg',
        '/images/harry-potter/13.jpg',
      ],
    },
    create: {
      slug: 'harry-potter',
      name: 'Гаррі Поттер',
      subtitle: 'Магія поруч',
      tagline: 'Ваш лист із Гоґвортсу вже чекає.',
      description: 'Ласкаво просимо до світу магії! Квест за мотивами всесвіту Гаррі Поттера перенесе вас до школи чарівництва. Зілля, заклинання, чарівні істоти — усе це чекає на вас. Ідеально для сімейного відпочинку та святкування дня народження.',
      plotSummary: 'Ви отримали лист із Гоґвортсу! Але щоб стати справжніми чарівниками, потрібно пройти випробування. Відвідайте уроки зіллєваріння, захисту від темних мистецтв і трансфігурації. Розкрийте таємницю замку та отримайте свій магічний диплом.',
      genre: 'Фентезі',
      ageMin: 8,
      duration: 90,
      minPlayers: 2,
      maxPlayers: 6,
      hasActor: false,
      hasRestZone: true,
      accentColor: '#7C3AED',
      heroImage: '/images/harry.png',
      photos: [
        '/images/harry-potter/1.jpg',
        '/images/harry-potter/2.jpg',
        '/images/harry-potter/3.jpg',
        '/images/harry-potter/4.jpg',
        '/images/harry-potter/5.jpg',
        '/images/harry-potter/6.jpg',
        '/images/harry-potter/7.jpg',
        '/images/harry-potter/8.jpg',
        '/images/harry-potter/9.jpg',
        '/images/harry-potter/10.jpg',
        '/images/harry-potter/11.jpg',
        '/images/harry-potter/12.jpg',
        '/images/harry-potter/13.jpg',
      ],
      rating: 4.9,
      reviewCount: 0,
      isActive: true,
    },
  });

  const packages = [
    {
      slug: 'mystic-party',
      name: 'Містична вечірка',
      description: 'Silent Hill з актором + гра "Мафія" + зона відпочинку. Ідеально для компанії друзів, які шукають гострих відчуттів.',
      basePrice: 5000,
      basePlayers: 6,
      pricePerExtra: 500,
      maxPlayers: 12,
      durationMin: 180,
      includes: ['Silent Hill з актором', 'Гра "Мафія" (1 година)', 'Зона відпочинку (30 хв)'],
    },
    {
      slug: 'dn-hogwarts-economy',
      name: 'ДН Хогвартс: Економ',
      description: 'Обидва квести без акторів + зона відпочинку між іграми. Бюджетний варіант для святкування.',
      basePrice: 4600,
      basePlayers: 4,
      pricePerExtra: 500,
      maxPlayers: 8,
      durationMin: 210,
      includes: ['Гаррі Поттер (без актора)', 'Silent Hill (без актора)', 'Зона відпочинку (30 хв між квестами)'],
    },
    {
      slug: 'dn-hogwarts-standard',
      name: 'ДН Хогвартс: Стандарт',
      description: 'Обидва квести з акторами + зона відпочинку + запрошення. Повне занурення у світ магії.',
      basePrice: 9500,
      basePlayers: 4,
      pricePerExtra: 500,
      maxPlayers: 8,
      durationMin: 240,
      includes: ['Гаррі Поттер з актором', 'Silent Hill з актором', 'Зона відпочинку (30 хв)', 'Тематичні запрошення'],
    },
    {
      slug: 'dn-hogwarts-premium',
      name: 'ДН Хогвартс: Преміум',
      description: 'Обидва квести з акторами + зона відпочинку + мантії. Максимальний рівень занурення.',
      basePrice: 9000,
      basePlayers: 4,
      pricePerExtra: 500,
      maxPlayers: 8,
      durationMin: 270,
      includes: ['Гаррі Поттер з актором', 'Silent Hill з актором', 'Зона відпочинку (60 хв сумарно)', 'Мантії для всіх учасників'],
    },
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: {},
      create: pkg,
    });
  }

  console.log('✅ Seed completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
