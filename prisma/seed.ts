import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean existing data
  console.log("🧹 Cleaning existing data...");
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationUser.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.earning.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.serviceMedia.deleteMany();
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  // =====================================================
  // CREATE USERS
  // =====================================================
  console.log("👤 Creating users...");

  // Professionals
  const sarahJohnson = await prisma.user.create({
    data: {
      email: "sarah.johnson@example.com",
      emailVerified: new Date(),
      name: "Sarah Johnson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      phone: "+1234567890",
      bio: "Professional house cleaner with 5+ years of experience. Specializing in eco-friendly cleaning solutions and attention to detail.",
      location: "San Francisco, CA",
      isProfessional: true,
      professionalSince: new Date("2019-01-15"),
    },
  });

  const mikeChen = await prisma.user.create({
    data: {
      email: "mike.chen@example.com",
      emailVerified: new Date(),
      name: "Mike Chen",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
      phone: "+1234567891",
      bio: "Full-stack developer with expertise in React, Node.js, and cloud architecture. Building scalable web applications.",
      location: "Seattle, WA",
      isProfessional: true,
      professionalSince: new Date("2018-06-01"),
    },
  });

  const emilyRoberts = await prisma.user.create({
    data: {
      email: "emily.roberts@example.com",
      emailVerified: new Date(),
      name: "Dr. Emily Roberts",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
      phone: "+1234567892",
      bio: "PhD in Mathematics, specializing in high school and college-level tutoring. Making complex concepts simple and engaging.",
      location: "Boston, MA",
      isProfessional: true,
      professionalSince: new Date("2017-09-01"),
    },
  });

  const alexTaylor = await prisma.user.create({
    data: {
      email: "alex.taylor@example.com",
      emailVerified: new Date(),
      name: "Alex Taylor",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      phone: "+1234567893",
      bio: "Licensed beautician and makeup artist. Specializing in bridal makeup, special events, and personal styling.",
      location: "Los Angeles, CA",
      isProfessional: true,
      professionalSince: new Date("2020-03-15"),
    },
  });

  const davidMiller = await prisma.user.create({
    data: {
      email: "david.miller@example.com",
      emailVerified: new Date(),
      name: "David Miller",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
      phone: "+1234567894",
      bio: "ASE certified mechanic with 10+ years experience. Specializing in diagnostics, maintenance, and repairs for all vehicle makes.",
      location: "Austin, TX",
      isProfessional: true,
      professionalSince: new Date("2014-01-01"),
    },
  });

  const sophiaGarcia = await prisma.user.create({
    data: {
      email: "sophia.garcia@example.com",
      emailVerified: new Date(),
      name: "Sophia Garcia",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=sophia",
      phone: "+1234567895",
      bio: "Professional photographer specializing in portraits, events, and commercial photography. Capturing moments that matter.",
      location: "Miami, FL",
      isProfessional: true,
      professionalSince: new Date("2016-05-20"),
    },
  });

  // Dual-role users (both customer and professional)
  const jamesWilson = await prisma.user.create({
    data: {
      email: "james.wilson@example.com",
      emailVerified: new Date(),
      name: "James Wilson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
      phone: "+1234567896",
      bio: "Part-time fitness trainer and nutrition consultant. Helping clients achieve their health and fitness goals.",
      location: "Chicago, IL",
      isProfessional: true,
      professionalSince: new Date("2021-01-10"),
    },
  });

  // Customer-only users
  const lisaAnderson = await prisma.user.create({
    data: {
      email: "lisa.anderson@example.com",
      emailVerified: new Date(),
      name: "Lisa Anderson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa",
      phone: "+1234567897",
      bio: "Busy professional looking for reliable service providers.",
      location: "New York, NY",
      isProfessional: false,
    },
  });

  const robertBrown = await prisma.user.create({
    data: {
      email: "robert.brown@example.com",
      emailVerified: new Date(),
      name: "Robert Brown",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=robert",
      phone: "+1234567898",
      location: "Denver, CO",
      isProfessional: false,
    },
  });

  const mariaDavis = await prisma.user.create({
    data: {
      email: "maria.davis@example.com",
      emailVerified: new Date(),
      name: "Maria Davis",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
      phone: "+1234567899",
      bio: "Parent of two, looking for tutoring and home services.",
      location: "Phoenix, AZ",
      isProfessional: false,
    },
  });

  // =====================================================
  // CREATE CATEGORIES
  // =====================================================
  console.log("📁 Creating categories...");

  const homeCategory = await prisma.category.create({
    data: {
      name: "Home Services",
      description: "Professional services for your home",
      icon: "🏠",
      slug: "home-services",
    },
  });

  const techCategory = await prisma.category.create({
    data: {
      name: "Tech & Digital",
      description: "Technology and digital services",
      icon: "💻",
      slug: "tech-digital",
    },
  });

  const educationCategory = await prisma.category.create({
    data: {
      name: "Education",
      description: "Tutoring and educational services",
      icon: "📚",
      slug: "education",
    },
  });

  const beautyCategory = await prisma.category.create({
    data: {
      name: "Beauty & Wellness",
      description: "Beauty, health, and wellness services",
      icon: "💄",
      slug: "beauty-wellness",
    },
  });

  const automotiveCategory = await prisma.category.create({
    data: {
      name: "Automotive",
      description: "Vehicle maintenance and repair services",
      icon: "🚗",
      slug: "automotive",
    },
  });

  const creativeCategory = await prisma.category.create({
    data: {
      name: "Creative Services",
      description: "Photography, design, and creative services",
      icon: "📸",
      slug: "creative-services",
    },
  });

  // Create subcategories
  const houseCleaning = await prisma.category.create({
    data: {
      name: "House Cleaning",
      description: "Professional cleaning services",
      slug: "house-cleaning",
      parentId: homeCategory.id,
    },
  });

  const webDevelopment = await prisma.category.create({
    data: {
      name: "Web Development",
      description: "Website and web application development",
      slug: "web-development",
      parentId: techCategory.id,
    },
  });

  const mathTutoring = await prisma.category.create({
    data: {
      name: "Math Tutoring",
      description: "Mathematics tutoring for all levels",
      slug: "math-tutoring",
      parentId: educationCategory.id,
    },
  });

  const makeup = await prisma.category.create({
    data: {
      name: "Makeup Services",
      description: "Professional makeup services",
      slug: "makeup-services",
      parentId: beautyCategory.id,
    },
  });

  const carRepair = await prisma.category.create({
    data: {
      name: "Car Repair",
      description: "Vehicle repair and maintenance",
      slug: "car-repair",
      parentId: automotiveCategory.id,
    },
  });

  const photography = await prisma.category.create({
    data: {
      name: "Photography",
      description: "Professional photography services",
      slug: "photography",
      parentId: creativeCategory.id,
    },
  });

  const fitness = await prisma.category.create({
    data: {
      name: "Fitness Training",
      description: "Personal training and fitness coaching",
      slug: "fitness-training",
      parentId: beautyCategory.id,
    },
  });

  // =====================================================
  // CREATE SERVICES
  // =====================================================
  console.log("🛠️ Creating services...");

  const cleaningService = await prisma.service.create({
    data: {
      title: "Professional House Cleaning",
      description: "Comprehensive house cleaning service using eco-friendly products. Includes all rooms, kitchen deep clean, bathroom sanitization, and floor care. Perfect for busy professionals and families.",
      shortDescription: "Eco-friendly house cleaning with attention to detail",
      status: "ACTIVE",
      categoryId: houseCleaning.id,
      providerId: sarahJohnson.id,
      priceType: "FIXED",
      price: 80,
      priceUnit: "session",
      duration: 120,
      location: "San Francisco, CA",
      serviceType: "IN_PERSON",
      maxBookingsPerDay: 3,
      cancellationPolicy: "Free cancellation up to 24 hours before the service. 50% charge for cancellations within 24 hours.",
      tags: ["eco-friendly", "professional", "insured", "pet-friendly"],
      features: ["Eco-friendly products", "Bring own supplies", "Insured & bonded", "Satisfaction guarantee"],
      requirements: "Please ensure pets are secured. Clear surfaces for better cleaning results.",
      averageRating: 4.9,
      totalReviews: 234,
      bookingCount: 567,
      viewCount: 2341,
      isFeatured: true,
    },
  });

  const webDevService = await prisma.service.create({
    data: {
      title: "Full-Stack Web Development",
      description: "Custom web development services including frontend (React, Vue, Angular) and backend (Node.js, Python, Ruby) development. Database design, API integration, and cloud deployment included.",
      shortDescription: "Custom web applications from concept to deployment",
      status: "ACTIVE",
      categoryId: webDevelopment.id,
      providerId: mikeChen.id,
      priceType: "HOURLY",
      price: 150,
      priceUnit: "hour",
      serviceType: "ONLINE",
      advanceBookingDays: 14,
      cancellationPolicy: "Free cancellation up to 48 hours before the project start.",
      tags: ["react", "nodejs", "fullstack", "api", "cloud"],
      features: ["Source code included", "Post-launch support", "Responsive design", "SEO optimization"],
      averageRating: 5.0,
      totalReviews: 89,
      bookingCount: 142,
      viewCount: 1893,
      isFeatured: true,
    },
  });

  const mathTutoringService = await prisma.service.create({
    data: {
      title: "Advanced Math Tutoring",
      description: "Personalized math tutoring for high school and college students. Covering algebra, calculus, statistics, and more. Proven methods to improve understanding and grades.",
      shortDescription: "Expert math tutoring for all levels",
      status: "ACTIVE",
      categoryId: mathTutoring.id,
      providerId: emilyRoberts.id,
      priceType: "HOURLY",
      price: 60,
      priceUnit: "hour",
      duration: 60,
      serviceType: "HYBRID",
      maxBookingsPerDay: 5,
      cancellationPolicy: "Free cancellation up to 12 hours before the session.",
      tags: ["algebra", "calculus", "statistics", "sat-prep", "online"],
      features: ["Customized lesson plans", "Practice materials included", "Progress tracking", "Parent reports available"],
      requirements: "Student should have textbook and calculator ready.",
      averageRating: 4.8,
      totalReviews: 156,
      bookingCount: 423,
      viewCount: 1567,
    },
  });

  const makeupService = await prisma.service.create({
    data: {
      title: "Professional Makeup & Styling",
      description: "Complete makeup services for special events, weddings, photoshoots, and more. Includes consultation, skin prep, and long-lasting application using premium products.",
      shortDescription: "Glamorous makeup for any occasion",
      status: "ACTIVE",
      categoryId: makeup.id,
      providerId: alexTaylor.id,
      priceType: "FIXED",
      price: 120,
      priceUnit: "session",
      duration: 90,
      location: "Los Angeles, CA",
      serviceType: "IN_PERSON",
      maxBookingsPerDay: 4,
      cancellationPolicy: "50% deposit required. Non-refundable within 48 hours of appointment.",
      tags: ["bridal", "events", "photoshoot", "airbrush"],
      features: ["Premium products", "False lashes included", "Touch-up kit provided", "Trial session available"],
      averageRating: 4.9,
      totalReviews: 203,
      bookingCount: 389,
      viewCount: 2104,
    },
  });

  const carMaintenanceService = await prisma.service.create({
    data: {
      title: "Complete Auto Maintenance",
      description: "Full-service auto maintenance including oil changes, brake service, tire rotation, and comprehensive inspections. All makes and models welcome.",
      shortDescription: "Expert car maintenance and repair",
      status: "ACTIVE",
      categoryId: carRepair.id,
      providerId: davidMiller.id,
      priceType: "CUSTOM",
      price: 0,
      priceUnit: "quote",
      location: "Austin, TX",
      serviceType: "IN_PERSON",
      advanceBookingDays: 7,
      cancellationPolicy: "Free cancellation up to 24 hours before appointment.",
      tags: ["certified", "warranty", "all-makes", "diagnostics"],
      features: ["ASE certified", "Warranty on parts", "Free inspection", "Loaner cars available"],
      requirements: "Please bring vehicle registration and any service records.",
      averageRating: 4.7,
      totalReviews: 312,
      bookingCount: 678,
      viewCount: 3421,
    },
  });

  const photographyService = await prisma.service.create({
    data: {
      title: "Event & Portrait Photography",
      description: "Professional photography services for events, portraits, and commercial needs. High-resolution images with professional editing included.",
      shortDescription: "Capturing your special moments",
      status: "ACTIVE",
      categoryId: photography.id,
      providerId: sophiaGarcia.id,
      priceType: "FIXED",
      price: 300,
      priceUnit: "session",
      duration: 180,
      location: "Miami, FL",
      serviceType: "IN_PERSON",
      maxBookingsPerDay: 2,
      cancellationPolicy: "50% deposit required. Non-refundable within 72 hours of shoot.",
      tags: ["portraits", "events", "weddings", "commercial"],
      features: ["Professional editing", "Online gallery", "Print rights included", "Quick turnaround"],
      averageRating: 4.9,
      totalReviews: 178,
      bookingCount: 234,
      viewCount: 1876,
      isFeatured: true,
    },
  });

  const fitnessService = await prisma.service.create({
    data: {
      title: "Personal Fitness Training",
      description: "Customized fitness training programs designed to help you reach your health and fitness goals. Includes nutrition guidance and progress tracking.",
      shortDescription: "Transform your fitness journey",
      status: "ACTIVE",
      categoryId: fitness.id,
      providerId: jamesWilson.id,
      priceType: "HOURLY",
      price: 75,
      priceUnit: "session",
      duration: 60,
      serviceType: "HYBRID",
      maxBookingsPerDay: 6,
      cancellationPolicy: "Free cancellation up to 12 hours before session.",
      tags: ["weight-loss", "strength", "cardio", "nutrition"],
      features: ["Personalized workout plans", "Nutrition guidance", "Progress tracking", "Online support"],
      averageRating: 4.8,
      totalReviews: 92,
      bookingCount: 156,
      viewCount: 987,
    },
  });

  // Add more varied services
  const plumbingService = await prisma.service.create({
    data: {
      title: "Emergency Plumbing Services",
      description: "24/7 emergency plumbing services. Leak repairs, drain cleaning, fixture installation, and more.",
      shortDescription: "Fast and reliable plumbing solutions",
      status: "ACTIVE",
      categoryId: homeCategory.id,
      providerId: sarahJohnson.id, // Sarah offers multiple services
      priceType: "HOURLY",
      price: 95,
      priceUnit: "hour",
      duration: 60,
      location: "San Francisco, CA",
      serviceType: "IN_PERSON",
      tags: ["emergency", "24-7", "licensed", "insured"],
      features: ["24/7 availability", "Licensed & insured", "Free estimates", "Warranty on work"],
      averageRating: 4.6,
      totalReviews: 143,
      bookingCount: 298,
      viewCount: 1543,
    },
  });

  const graphicDesignService = await prisma.service.create({
    data: {
      title: "Graphic Design & Branding",
      description: "Professional graphic design services including logo design, brand identity, marketing materials, and digital assets.",
      shortDescription: "Creative design solutions for your brand",
      status: "ACTIVE",
      categoryId: creativeCategory.id,
      providerId: sophiaGarcia.id, // Sophia does both photography and design
      priceType: "FIXED",
      price: 500,
      priceUnit: "project",
      serviceType: "ONLINE",
      tags: ["logo", "branding", "marketing", "digital"],
      features: ["Unlimited revisions", "Source files included", "Brand guidelines", "Fast turnaround"],
      averageRating: 4.9,
      totalReviews: 67,
      bookingCount: 89,
      viewCount: 654,
    },
  });

  const languageTutoringService = await prisma.service.create({
    data: {
      title: "Spanish Language Tutoring",
      description: "Learn Spanish from a native speaker. Conversational Spanish, business Spanish, or exam preparation.",
      shortDescription: "Master Spanish with a native speaker",
      status: "ACTIVE",
      categoryId: educationCategory.id,
      providerId: emilyRoberts.id, // Emily teaches both math and languages
      priceType: "HOURLY",
      price: 45,
      priceUnit: "hour",
      duration: 60,
      serviceType: "ONLINE",
      tags: ["spanish", "language", "conversation", "business"],
      features: ["Native speaker", "Flexible scheduling", "Materials included", "Progress tracking"],
      averageRating: 4.7,
      totalReviews: 234,
      bookingCount: 456,
      viewCount: 1234,
    },
  });

  // =====================================================
  // CREATE SERVICE MEDIA
  // =====================================================
  console.log("📷 Adding service media...");

  await prisma.serviceMedia.createMany({
    data: [
      {
        serviceId: cleaningService.id,
        url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
        type: "IMAGE",
        caption: "Sparkling clean kitchen",
        order: 1,
      },
      {
        serviceId: cleaningService.id,
        url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136",
        type: "IMAGE",
        caption: "Professional cleaning supplies",
        order: 2,
      },
      {
        serviceId: webDevService.id,
        url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
        type: "IMAGE",
        caption: "Modern web development",
        order: 1,
      },
      {
        serviceId: photographyService.id,
        url: "https://images.unsplash.com/photo-1606986628253-05620e6a0a81",
        type: "IMAGE",
        caption: "Professional photography equipment",
        order: 1,
      },
      {
        serviceId: makeupService.id,
        url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
        type: "IMAGE",
        caption: "Bridal makeup",
        order: 1,
      },
    ],
  });

  // =====================================================
  // CREATE AVAILABILITY
  // =====================================================
  console.log("📅 Setting availability schedules...");

  // Sarah's cleaning availability (Mon-Sat, 8am-6pm)
  for (let day = 1; day <= 6; day++) {
    await prisma.availability.create({
      data: {
        serviceId: cleaningService.id,
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "18:00",
      },
    });
  }

  // Mike's development availability (Mon-Fri, 9am-5pm)
  for (let day = 1; day <= 5; day++) {
    await prisma.availability.create({
      data: {
        serviceId: webDevService.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
      },
    });
  }

  // Emily's tutoring availability (Mon-Fri 3pm-9pm, Sat 10am-4pm)
  for (let day = 1; day <= 5; day++) {
    await prisma.availability.create({
      data: {
        serviceId: mathTutoringService.id,
        dayOfWeek: day,
        startTime: "15:00",
        endTime: "21:00",
      },
    });
  }
  await prisma.availability.create({
    data: {
      serviceId: mathTutoringService.id,
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "16:00",
    },
  });

  // =====================================================
  // CREATE BOOKINGS
  // =====================================================
  console.log("📋 Creating bookings...");

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Completed booking with review
  const completedBooking1 = await prisma.booking.create({
    data: {
      serviceId: cleaningService.id,
      customerId: lisaAnderson.id,
      providerId: sarahJohnson.id,
      status: "COMPLETED",
      bookingDate: twoWeeksAgo,
      startTime: "10:00",
      endTime: "12:00",
      duration: 120,
      price: 80,
      serviceFee: 8,
      totalAmount: 88,
      specialRequests: "Please focus on the kitchen and bathrooms",
      customerNotes: "Great service!",
      confirmedAt: new Date(twoWeeksAgo.getTime() - 24 * 60 * 60 * 1000),
      completedAt: twoWeeksAgo,
    },
  });

  // Another completed booking
  const completedBooking2 = await prisma.booking.create({
    data: {
      serviceId: mathTutoringService.id,
      customerId: mariaDavis.id,
      providerId: emilyRoberts.id,
      status: "COMPLETED",
      bookingDate: oneWeekAgo,
      startTime: "16:00",
      endTime: "17:00",
      duration: 60,
      price: 60,
      serviceFee: 6,
      totalAmount: 66,
      specialRequests: "Help with calculus homework",
      customerNotes: "Very helpful session",
      confirmedAt: new Date(oneWeekAgo.getTime() - 12 * 60 * 60 * 1000),
      completedAt: oneWeekAgo,
    },
  });

  // Completed booking for web development
  const completedBooking3 = await prisma.booking.create({
    data: {
      serviceId: webDevService.id,
      customerId: robertBrown.id,
      providerId: mikeChen.id,
      status: "COMPLETED",
      bookingDate: oneWeekAgo,
      startTime: "09:00",
      endTime: "12:00",
      duration: 180,
      price: 450, // 3 hours * $150
      serviceFee: 45,
      totalAmount: 495,
      specialRequests: "Need help with React component optimization",
      providerNotes: "Optimized 5 components, improved performance by 40%",
      confirmedAt: new Date(oneWeekAgo.getTime() - 48 * 60 * 60 * 1000),
      completedAt: oneWeekAgo,
    },
  });

  // In-progress booking (happening now)
  const inProgressBooking = await prisma.booking.create({
    data: {
      serviceId: makeupService.id,
      customerId: lisaAnderson.id,
      providerId: alexTaylor.id,
      status: "IN_PROGRESS",
      bookingDate: now,
      startTime: "14:00",
      endTime: "15:30",
      duration: 90,
      price: 120,
      serviceFee: 12,
      totalAmount: 132,
      specialRequests: "Natural look for corporate event",
      confirmedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  });

  // Confirmed future bookings
  const confirmedBooking1 = await prisma.booking.create({
    data: {
      serviceId: photographyService.id,
      customerId: robertBrown.id,
      providerId: sophiaGarcia.id,
      status: "CONFIRMED",
      bookingDate: oneWeekFromNow,
      startTime: "10:00",
      endTime: "13:00",
      duration: 180,
      price: 300,
      serviceFee: 30,
      totalAmount: 330,
      specialRequests: "Family portrait session at the park",
      confirmedAt: now,
    },
  });

  const confirmedBooking2 = await prisma.booking.create({
    data: {
      serviceId: fitnessService.id,
      customerId: mariaDavis.id,
      providerId: jamesWilson.id,
      status: "CONFIRMED",
      bookingDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      startTime: "06:00",
      endTime: "07:00",
      duration: 60,
      price: 75,
      serviceFee: 7.5,
      totalAmount: 82.5,
      specialRequests: "Focus on core strength",
      confirmedAt: now,
    },
  });

  // Pending booking
  const pendingBooking = await prisma.booking.create({
    data: {
      serviceId: carMaintenanceService.id,
      customerId: lisaAnderson.id,
      providerId: davidMiller.id,
      status: "PENDING",
      bookingDate: twoWeeksFromNow,
      startTime: "09:00",
      endTime: "11:00",
      duration: 120,
      price: 150,
      serviceFee: 15,
      totalAmount: 165,
      specialRequests: "Oil change and tire rotation",
    },
  });

  // Cancelled booking
  const cancelledBooking = await prisma.booking.create({
    data: {
      serviceId: cleaningService.id,
      customerId: robertBrown.id,
      providerId: sarahJohnson.id,
      status: "CANCELLED",
      bookingDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      startTime: "14:00",
      endTime: "16:00",
      duration: 120,
      price: 80,
      serviceFee: 8,
      totalAmount: 88,
      cancellationReason: "Customer had emergency travel",
      cancelledAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  // =====================================================
  // CREATE PAYMENTS
  // =====================================================
  console.log("💳 Creating payments...");

  await prisma.payment.createMany({
    data: [
      {
        bookingId: completedBooking1.id,
        userId: lisaAnderson.id,
        amount: 88,
        status: "COMPLETED",
        method: "CREDIT_CARD",
        transactionId: "txn_" + Math.random().toString(36).substr(2, 9),
        paidAt: completedBooking1.completedAt,
      },
      {
        bookingId: completedBooking2.id,
        userId: mariaDavis.id,
        amount: 66,
        status: "COMPLETED",
        method: "PAYPAL",
        transactionId: "txn_" + Math.random().toString(36).substr(2, 9),
        paidAt: completedBooking2.completedAt,
      },
      {
        bookingId: completedBooking3.id,
        userId: robertBrown.id,
        amount: 495,
        status: "COMPLETED",
        method: "CREDIT_CARD",
        transactionId: "txn_" + Math.random().toString(36).substr(2, 9),
        paidAt: completedBooking3.completedAt,
      },
      {
        bookingId: inProgressBooking.id,
        userId: lisaAnderson.id,
        amount: 132,
        status: "PROCESSING",
        method: "CREDIT_CARD",
      },
      {
        bookingId: confirmedBooking1.id,
        userId: robertBrown.id,
        amount: 330,
        status: "PENDING",
        method: "CREDIT_CARD",
      },
    ],
  });

  // =====================================================
  // CREATE REVIEWS
  // =====================================================
  console.log("⭐ Creating reviews...");

  await prisma.review.create({
    data: {
      bookingId: completedBooking1.id,
      serviceId: cleaningService.id,
      reviewerId: lisaAnderson.id,
      revieweeId: sarahJohnson.id,
      rating: 5,
      title: "Excellent cleaning service!",
      comment: "Sarah did an amazing job cleaning our home. She was punctual, professional, and paid great attention to detail. The eco-friendly products she used left our home smelling fresh without harsh chemicals. Highly recommend!",
      quality: 5,
      value: 5,
      communication: 5,
      punctuality: 5,
    },
  });

  await prisma.review.create({
    data: {
      bookingId: completedBooking2.id,
      serviceId: mathTutoringService.id,
      reviewerId: mariaDavis.id,
      revieweeId: emilyRoberts.id,
      rating: 5,
      title: "Great tutor for my daughter",
      comment: "Dr. Roberts is patient and explains complex concepts in a way that's easy to understand. My daughter's grades have improved significantly since starting sessions. Worth every penny!",
      quality: 5,
      value: 4,
      communication: 5,
      punctuality: 5,
    },
  });

  await prisma.review.create({
    data: {
      bookingId: completedBooking3.id,
      serviceId: webDevService.id,
      reviewerId: robertBrown.id,
      revieweeId: mikeChen.id,
      rating: 5,
      title: "Expert developer, exceeded expectations",
      comment: "Mike helped optimize our React application and the results were outstanding. Page load times decreased by 40% and the code is much cleaner. He explained everything clearly and provided documentation. Will definitely hire again!",
      quality: 5,
      value: 5,
      communication: 5,
      punctuality: 5,
    },
  });

  // =====================================================
  // CREATE EARNINGS
  // =====================================================
  console.log("💰 Creating earnings...");

  await prisma.earning.createMany({
    data: [
      {
        userId: sarahJohnson.id,
        bookingId: completedBooking1.id,
        amount: 80,
        serviceFee: 8,
        netAmount: 72,
        status: "AVAILABLE",
        earnedAt: completedBooking1.completedAt!,
        availableAt: new Date(completedBooking1.completedAt!.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        userId: emilyRoberts.id,
        bookingId: completedBooking2.id,
        amount: 60,
        serviceFee: 6,
        netAmount: 54,
        status: "AVAILABLE",
        earnedAt: completedBooking2.completedAt!,
        availableAt: new Date(completedBooking2.completedAt!.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        userId: mikeChen.id,
        bookingId: completedBooking3.id,
        amount: 450,
        serviceFee: 45,
        netAmount: 405,
        status: "AVAILABLE",
        earnedAt: completedBooking3.completedAt!,
        availableAt: new Date(completedBooking3.completedAt!.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // =====================================================
  // CREATE CONVERSATIONS & MESSAGES
  // =====================================================
  console.log("💬 Creating conversations and messages...");

  const conversation1 = await prisma.conversation.create({
    data: {
      lastMessageAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
  });

  await prisma.conversationUser.createMany({
    data: [
      {
        conversationId: conversation1.id,
        userId: lisaAnderson.id,
        unreadCount: 0,
        lastReadAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        conversationId: conversation1.id,
        userId: sarahJohnson.id,
        unreadCount: 0,
        lastReadAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation1.id,
        senderId: lisaAnderson.id,
        recipientId: sarahJohnson.id,
        content: "Hi Sarah, I'd like to book your cleaning service for next week.",
        type: "TEXT",
        isRead: true,
        readAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        conversationId: conversation1.id,
        senderId: sarahJohnson.id,
        recipientId: lisaAnderson.id,
        content: "Hi Lisa! I'd be happy to help. What day works best for you?",
        type: "TEXT",
        isRead: true,
        readAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      },
      {
        conversationId: conversation1.id,
        senderId: lisaAnderson.id,
        recipientId: sarahJohnson.id,
        content: "Tuesday morning would be perfect if you're available.",
        type: "TEXT",
        isRead: true,
        readAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      },
      {
        conversationId: conversation1.id,
        senderId: sarahJohnson.id,
        recipientId: lisaAnderson.id,
        content: "Tuesday at 10 AM works great! I'll send you a booking confirmation.",
        type: "TEXT",
        isRead: true,
        readAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  // =====================================================
  // CREATE NOTIFICATIONS
  // =====================================================
  console.log("🔔 Creating notifications...");

  await prisma.notification.createMany({
    data: [
      {
        userId: lisaAnderson.id,
        type: "BOOKING_CONFIRMED",
        title: "Booking Confirmed",
        message: "Your photography session with Sophia Garcia has been confirmed for next week.",
        isRead: false,
        createdAt: now,
      },
      {
        userId: sarahJohnson.id,
        type: "BOOKING_REQUEST",
        title: "New Booking Request",
        message: "You have a new booking request from David Miller for car maintenance service.",
        isRead: false,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        userId: mikeChen.id,
        type: "PAYMENT_RECEIVED",
        title: "Payment Received",
        message: "You've received a payment of $495 for your web development service.",
        isRead: true,
        readAt: oneWeekAgo,
        createdAt: oneWeekAgo,
      },
      {
        userId: emilyRoberts.id,
        type: "REVIEW_RECEIVED",
        title: "New Review",
        message: "Maria Davis left you a 5-star review!",
        isRead: true,
        readAt: new Date(oneWeekAgo.getTime() + 60 * 60 * 1000),
        createdAt: oneWeekAgo,
      },
    ],
  });

  // =====================================================
  // CREATE FAVORITES
  // =====================================================
  console.log("❤️ Creating favorites...");

  await prisma.favorite.createMany({
    data: [
      {
        userId: lisaAnderson.id,
        serviceId: cleaningService.id,
      },
      {
        userId: lisaAnderson.id,
        serviceId: makeupService.id,
      },
      {
        userId: robertBrown.id,
        serviceId: webDevService.id,
      },
      {
        userId: mariaDavis.id,
        serviceId: mathTutoringService.id,
      },
      {
        userId: mariaDavis.id,
        serviceId: fitnessService.id,
      },
    ],
  });

  console.log("✅ Database seeded successfully!");
  console.log(`
  📊 Seed Summary:
  - Users: 10 (6 professionals, 1 dual-role, 3 customers)
  - Categories: 13 (6 main + 7 subcategories)
  - Services: 10
  - Bookings: 8 (various statuses)
  - Reviews: 3
  - Payments: 5
  - Messages: 4
  - Notifications: 4
  - Favorites: 5
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });