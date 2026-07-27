import { createContext, useContext } from "react";

export type Lang = "ar" | "en";
export type Dict = {
  appName: string;
  appSubtitle: string;
  nav: {
    overview: string;
    urban: string;
    agricultural: string;
    industrial: string;
    prices: string;
    comparison: string;
    story: string;
    changeSamples: string;
  };
  filters: {
    title: string;
    sector: string;
    axis: string;
    usage: string;
    changeStatus: string;
    all: string;
    reset: string;
  };
  map: {
    title: string;
    layers: string;
    legend: string;
    basemap: string;
    blue: string;
    dark: string;
    satellite: string;
    streets: string;
    year2016: string;
    year2026: string;
    compare: string;
    fullScreen: string;
  };
  layers: {
    study_area: string;
    axis: string;
    land_2016: string;
    land_2026: string;
    urban: string;
    agri: string;
    industrial: string;
    water: string;
  };
  stats: {
    studyArea: string;
    axisLength: string;
    urbanArea: string;
    agriArea: string;
    industrialArea: string;
    waterArea: string;
    featuresCount: string;
    km2: string;
    km: string;
    feddan: string;
  };
  charts: {
    landUse2016: string;
    landUse2026: string;
    compareUse: string;
    urbanByType: string;
    crops: string;
    ownership: string;
    industrialDesc: string;
    changeStatus: string;
    waterBodies: string;
    deltaTitle: string;
    changeTable: string;
    topGrowing: string;
    topShrinking: string;
    plotSizeAgri: string;
    topPlots: string;
    topFacilities: string;
    facilitySize: string;
    urbanBlockSize: string;
    topUrbanBlocks: string;
    waterSize: string;
    shareCompare: string;
    movers: string;
    treemap: string;
    radar: string;
    radial: string;
    lorenz: string;
    gauge: string;
    cumulativeAgri: string;
    cumulativeIndustrial: string;
    cumulativeUrban: string;
    sectorProfile: string;
    sectorMix: string;
    landShareDonut: string;
  };
  common: {
    loading: string;
    noData: string;
    area: string;
    name: string;
    type: string;
    details: string;
    growth: string;
    share: string;
    period: string;
    total: string;
    avg: string;
    median: string;
    largest: string;
    smallest: string;
    concentration: string;
  };
  decisions: { title: string; urbanGrowth: string; agriShrink: string; industrialGrowth: string };
  insights: {
    title: string;
    urbanBoomTitle: string;
    urbanBoomBody: string;
    agriExpandTitle: string;
    agriExpandBody: string;
    industrialUpTitle: string;
    industrialUpBody: string;
    vacantDropTitle: string;
    vacantDropBody: string;
    waterRiskTitle: string;
    waterRiskBody: string;
    militaryTitle: string;
    militaryBody: string;
    densityTitle: string;
    densityBody: string;
    investmentTitle: string;
    investmentBody: string;
    fragmentationTitle: string;
    fragmentationBody: string;
    largePlotsTitle: string;
    largePlotsBody: string;
    smeIndustrialTitle: string;
    smeIndustrialBody: string;
    axisCorridorTitle: string;
    axisCorridorBody: string;
    residentialDominanceTitle: string;
    residentialDominanceBody: string;
  };
  story: {
    title: string;
    subtitle: string;
    carouselTitle: string;
    summaryStudyArea: string;
    summaryPeriod: string;
    summaryIndicators: string;
    netChange: string;
    previous: string;
    next: string;
    activeSlide: string;
    mapWaiting: string;
    slides: Record<
      "urban" | "agri" | "industrial" | "vacant" | "water" | "military",
      { eyebrow: string; title: string; body: string; impact: string }
    >;
  };
  changeSamples: {
    title: string;
    subtitle: string;
    carouselTitle: string;
    totalSamples: string;
    mode: string;
    sampleMix: string;
    mixValue: string;
    sampleLabel: string;
    changeType: string;
    closeZoom: string;
    sampleBoundary: string;
    mapWaiting: string;
    previous: string;
    next: string;
    kinds: Record<"urban" | "agri" | "industrial" | "water", string>;
  };
};

export const dict: Record<Lang, Dict> = {
  ar: {
    appName: "لوحة الإسماعيلية الجغرافية",
    appSubtitle: "نظام مؤشرات الأراضي والتغيرات العمرانية والزراعية والصناعية",
    nav: {
      overview: "نظرة عامة",
      urban: "العمران",
      agricultural: "الزراعة",
      industrial: "الصناعة",
      prices: "الأسعار",
      comparison: "مقارنة 2016 / 2026",
      story: "قصة التغيّر",
      changeSamples: "عينات التغيّر",
    },
    filters: {
      title: "الفلاتر",
      sector: "اسم القطاع",
      axis: "اسم المحور",
      usage: "وصف الاستخدام",
      changeStatus: "حالة التغير",
      all: "الكل",
      reset: "إعادة تعيين",
    },
    map: {
      title: "الخريطة التفاعلية",
      layers: "طبقات الخريطة",
      legend: "مفتاح الخريطة",
      basemap: "الخريطة الأساسية",
      blue: "أزرق مؤسسي",
      dark: "داكنة",
      satellite: "أقمار صناعية",
      streets: "شوارع",
      year2016: "عام 2016",
      year2026: "عام 2026",
      compare: "مقارنة جنباً إلى جنب",
      fullScreen: "ملء الشاشة",
    },
    layers: {
      study_area: "منطقة الدراسة",
      axis: "محور الطريق",
      land_2016: "استخدامات الأرض 2016",
      land_2026: "استخدامات الأرض 2026",
      urban: "التغيرات العمرانية",
      agri: "التغيرات الزراعية",
      industrial: "التغيرات الصناعية",
      water: "تغيرات المسطحات المائية",
    },
    stats: {
      studyArea: "إجمالي مساحة الدراسة",
      axisLength: "طول المحور",
      urbanArea: "مساحة العمران",
      agriArea: "مساحة الزراعة",
      industrialArea: "مساحة الصناعة",
      waterArea: "مساحة المياه",
      featuresCount: "عدد العناصر",
      km2: "كم²",
      km: "كم",
      feddan: "فدان",
    },
    charts: {
      landUse2016: "استخدامات الأرض - 2016",
      landUse2026: "استخدامات الأرض - 2026",
      compareUse: "مقارنة المساحات حسب الاستخدام 2016 - 2026",
      urbanByType: "العمران حسب نوع الاستخدام",
      crops: "أنواع المحاصيل الزراعية",
      ownership: "نوع ملكية الأراضي الزراعية",
      industrialDesc: "المنشآت الصناعية",
      changeStatus: "حالة التغير في 2026",
      waterBodies: "المسطحات المائية",
      deltaTitle: "صافي التغير في المساحة (كم²) 2016 → 2026",
      changeTable: "جدول التغير حسب الفئة",
      topGrowing: "أكثر الفئات نمواً",
      topShrinking: "أكثر الفئات انكماشاً",
      plotSizeAgri: "توزيع أحجام الحيازات الزراعية (فدان)",
      topPlots: "أكبر 10 حيازات زراعية",
      topFacilities: "أكبر 15 منشأة صناعية",
      facilitySize: "توزيع أحجام المنشآت الصناعية (كم²)",
      urbanBlockSize: "توزيع أحجام المباني (م²)",
      topUrbanBlocks: "أكبر 10 مجمعات عمرانية",
      waterSize: "توزيع أحجام المسطحات المائية (كم²)",
      shareCompare: "حصة كل فئة من إجمالي الاستخدام (٪)",
      movers: "أبرز التحركات بين 2016 و 2026",
      treemap: "خريطة شجرية لاستخدامات الأرض",
      radar: "ملف رادار للاستخدامات",
      radial: "مقارنة دائرية متعددة",
      lorenz: "منحنى التركز التراكمي",
      gauge: "مؤشر دائري",
      cumulativeAgri: "تركز الحيازات الزراعية (Lorenz)",
      cumulativeIndustrial: "تركز المنشآت الصناعية (Lorenz)",
      cumulativeUrban: "تركز المباني العمرانية (Lorenz)",
      sectorProfile: "ملف القطاعات (نسبة من الإجمالي)",
      sectorMix: "تركيبة استخدامات الأرض",
      landShareDonut: "حصة القطاع من إجمالي الدراسة",
    },
    common: {
      loading: "جارٍ التحميل…",
      noData: "لا توجد بيانات",
      area: "المساحة",
      name: "الاسم",
      type: "النوع",
      details: "التفاصيل",
      growth: "النمو",
      share: "الحصة",
      period: "الفترة",
      total: "الإجمالي",
      avg: "المتوسط",
      median: "الوسيط",
      largest: "الأكبر",
      smallest: "الأصغر",
      concentration: "تركز أعلى 10٪",
    },
    decisions: {
      title: "رؤى دعم القرار",
      urbanGrowth: "نمو العمران",
      agriShrink: "تغير المساحة الزراعية",
      industrialGrowth: "نمو القطاع الصناعي",
    },
    insights: {
      title: "رؤى دعم القرار",
      urbanBoomTitle: "طفرة عمرانية واضحة",
      urbanBoomBody:
        "تضاعفت تقريباً مساحة الاستخدام الحضري بين 2016 و2026، مما يستدعي توسيع شبكات الخدمات والمرافق والنقل لمواكبة النمو السكاني.",
      agriExpandTitle: "توسع زراعي إيجابي",
      agriExpandBody:
        "ارتفعت مساحة الأراضي الزراعية بشكل ملحوظ، وهو ما يدعم الأمن الغذائي ويفتح فرص استثمار في التصنيع الزراعي والتصدير.",
      industrialUpTitle: "نمو الاستثمار الصناعي",
      industrialUpBody:
        "ارتفاع عدد ومساحة المنشآت الصناعية يعكس جاذبية المنطقة، وينبه إلى ضرورة تخطيط مناطق صناعية متكاملة بمرافق وبنية تحتية ولوجستية.",
      vacantDropTitle: "تراجع الأراضي الفضاء",
      vacantDropBody:
        "انخفاض الأراضي الفضاء يدل على تحويلها إلى استخدامات منتجة (زراعة، صناعة، عمران) وهو مؤشر على ديناميكية التنمية بالمحور.",
      waterRiskTitle: "تراجع المسطحات المائية",
      waterRiskBody:
        "انكماش المسطحات المائية يستدعي مراجعة منظومة الري والصرف وحماية الموارد المائية من التعدي العمراني والزراعي.",
      militaryTitle: "إعادة تخصيص المناطق العسكرية",
      militaryBody:
        "تقلصت مساحة المناطق العسكرية لصالح استخدامات مدنية، ما يفتح فرصاً لمشاريع تنموية وسكنية وخدمية جديدة.",
      densityTitle: "كثافة الاستخدام لكل كم²",
      densityBody:
        "زيادة عدد العناصر مقابل المساحة تشير إلى ارتفاع كثافة المباني والمنشآت، وتستدعي تدقيق اشتراطات البناء والارتفاعات.",
      investmentTitle: "فرص استثمارية",
      investmentBody:
        "المساحات المستحدثة والتغيرات الكاملة تمثل بقعاً ساخنة للاستثمار العقاري والصناعي والخدمي على طول محور التنمية.",
      fragmentationTitle: "تجزؤ الحيازات الزراعية",
      fragmentationBody:
        "غالبية الحيازات صغيرة الحجم (أقل من 20 فدان)، مما يصعّب الميكنة الحديثة ويستوجب برامج لدمج الحيازات أو الإرشاد الزراعي الجماعي.",
      largePlotsTitle: "حيازات كبيرة جاهزة للاستثمار",
      largePlotsBody:
        "وجود حيازات تتجاوز 100 فدان يفتح فرصاً للاستثمار الزراعي التجاري والصناعات التحويلية والتصدير.",
      smeIndustrialTitle: "غلبة المنشآت الصغيرة والمتوسطة",
      smeIndustrialBody:
        "أكثر من 70٪ من المنشآت تقل مساحتها عن 0.05 كم²، وهو ما يتطلب تطوير حاضنات صناعية ومرافق مشتركة للسلاسل الإنتاجية.",
      axisCorridorTitle: "ممر التنمية حول المحور",
      axisCorridorBody:
        "تتركز التغيرات العمرانية والصناعية على طول محور الطريق، ما يعزز فرص اللوجستيات والخدمات المساندة.",
      residentialDominanceTitle: "سيطرة الاستخدام السكني",
      residentialDominanceBody:
        "يكاد يكون كل التوسع العمراني سكنياً، ما يتطلب تنويع الاستخدامات (تجاري، خدمي، إداري) لخدمة السكان الجدد.",
    },
    story: {
      title: "قصة التغيّر 2016 / 2026",
      subtitle: "سوايب تفاعلية تلخص أوضح التحولات في استخدامات الأراضي بالإسماعيلية.",
      carouselTitle: "أهم التحولات المكانية",
      summaryStudyArea: "مساحة الدراسة",
      summaryPeriod: "فترة المقارنة",
      summaryIndicators: "عدد المؤشرات",
      netChange: "صافي التغير",
      previous: "السلايد السابق",
      next: "السلايد التالي",
      activeSlide: "السلايد الحالي",
      mapWaiting: "الخريطة تظهر عند الوصول لهذا السلايد",
      slides: {
        urban: {
          eyebrow: "تحول عمراني",
          title: "العمران يتوسع بوضوح",
          body: "المساحة العمرانية ارتفعت بين 2016 و2026، وهو مؤشر مباشر على ضغط أكبر على الخدمات والمرافق وشبكات الحركة.",
          impact:
            "الأولوية التخطيطية هنا هي ربط التوسع السكني بالخدمات اليومية، والنقل، ومناطق العمل القريبة.",
        },
        agri: {
          eyebrow: "تحول زراعي",
          title: "زيادة كبيرة في الرقعة الزراعية",
          body: "الزراعة أصبحت صاحبة توسع واضح، ما يعكس تحويل جزء من الأراضي غير المستغلة إلى استخدام إنتاجي.",
          impact:
            "هذا التغير يدعم فرص التصنيع الزراعي وسلاسل الإمداد، لكنه يحتاج متابعة موارد الري والصرف.",
        },
        industrial: {
          eyebrow: "تحول صناعي",
          title: "نمو منتظم في النشاط الصناعي",
          body: "المساحات الصناعية زادت، ومعها تظهر حاجة أكبر إلى بنية لوجستية وخدمات مساندة حول المحاور الرئيسية.",
          impact: "الفرصة الأقوى هي توجيه النمو الصناعي إلى تجمعات مخططة بدل الانتشار المتفرق.",
        },
        vacant: {
          eyebrow: "تحول في الأراضي الفضاء",
          title: "تراجع الأراضي الفضاء",
          body: "انخفاض الأرض الفضاء يعني أن جزءاً كبيراً من المخزون المكاني تحول إلى استخدامات زراعية أو عمرانية أو صناعية.",
          impact:
            "هذا مؤشر تنمية إيجابي، لكنه يقلل هامش الاختيار المستقبلي ويحتاج إدارة دقيقة للأراضي المتبقية.",
        },
        water: {
          eyebrow: "تحول مائي",
          title: "انكماش المسطحات المائية",
          body: "المياه انخفضت بين 2016 و2026، وهو تغير حساس لأن تأثيره يتجاوز الخريطة إلى الزراعة والبيئة وجودة الحياة.",
          impact:
            "ينبغي قراءة هذا المؤشر مع شبكات الري والصرف وأولوية حماية المجاري والمسطحات القائمة.",
        },
        military: {
          eyebrow: "تحول استخدام",
          title: "انخفاض طفيف في المناطق العسكرية",
          body: "المناطق العسكرية تراجعت بشكل محدود، بما يفتح مساحة لقراءة احتمالات إعادة تخصيص بعض المواقع.",
          impact:
            "أي إعادة توظيف لهذه المساحات تحتاج ربطاً واضحاً بالاحتياجات الخدمية والسكنية والاستثمارية.",
        },
      },
    },
    changeSamples: {
      title: "عينات التغيّر القريبة",
      subtitle: "سوايب تعرض مواقع مختارة بزوم قريب للمقارنة بين استخدامات الأرض في 2016 و2026.",
      carouselTitle: "عينات مكانية 2016 / 2026",
      totalSamples: "عدد العينات",
      mode: "وضع المقارنة",
      sampleMix: "توزيع العينات",
      mixValue: "عمراني، زراعي، صناعي، مياه",
      sampleLabel: "عينة",
      changeType: "نوع التغيّر",
      closeZoom: "زوم قريب",
      sampleBoundary: "حدود العينة",
      mapWaiting: "الخريطة تظهر عند الوصول لهذه العينة",
      previous: "العينة السابقة",
      next: "العينة التالية",
      kinds: {
        urban: "تغير عمراني",
        agri: "تغير زراعي",
        industrial: "تغير صناعي",
        water: "تغير مائي",
      },
    },
  },
  en: {
    appName: "Ismailia Geo Dashboard",
    appSubtitle: "Land use indicators – urban, agricultural & industrial change",
    nav: {
      overview: "Overview",
      urban: "Urban",
      agricultural: "Agricultural",
      industrial: "Industrial",
      prices: "Prices",
      comparison: "Compare 2016 / 2026",
      story: "Change story",
      changeSamples: "Change samples",
    },
    filters: {
      title: "Filters",
      sector: "Sector",
      axis: "Axis",
      usage: "Land use",
      changeStatus: "Change status",
      all: "All",
      reset: "Reset",
    },
    map: {
      title: "Interactive Map",
      layers: "Map Layers",
      legend: "Legend",
      basemap: "Basemap",
      blue: "Corporate blue",
      dark: "Dark",
      satellite: "Satellite",
      streets: "Streets",
      year2016: "Year 2016",
      year2026: "Year 2026",
      compare: "Side-by-side compare",
      fullScreen: "Fullscreen",
    },
    layers: {
      study_area: "Study area",
      axis: "Axis road",
      land_2016: "Land use 2016",
      land_2026: "Land use 2026",
      urban: "Urban changes",
      agri: "Agricultural changes",
      industrial: "Industrial changes",
      water: "Water changes",
    },
    stats: {
      studyArea: "Total study area",
      axisLength: "Axis length",
      urbanArea: "Urban area",
      agriArea: "Agricultural area",
      industrialArea: "Industrial area",
      waterArea: "Water area",
      featuresCount: "Features",
      km2: "km²",
      km: "km",
      feddan: "feddan",
    },
    charts: {
      landUse2016: "Land use – 2016",
      landUse2026: "Land use – 2026",
      compareUse: "Land-use area comparison 2016 vs 2026",
      urbanByType: "Urban by usage type",
      crops: "Agricultural crop types",
      ownership: "Agricultural land ownership",
      industrialDesc: "Industrial facilities",
      changeStatus: "2026 change status",
      waterBodies: "Water bodies",
      deltaTitle: "Net area change (km²) 2016 → 2026",
      changeTable: "Change table by category",
      topGrowing: "Top growing categories",
      topShrinking: "Top shrinking categories",
      plotSizeAgri: "Agricultural plot-size distribution (feddan)",
      topPlots: "Top 10 largest plots",
      topFacilities: "Top 15 industrial facilities",
      facilitySize: "Industrial facility-size distribution (km²)",
      urbanBlockSize: "Urban footprint-size distribution (m²)",
      topUrbanBlocks: "Top 10 largest urban blocks",
      waterSize: "Water-body size distribution (km²)",
      shareCompare: "Share of total land use (%)",
      movers: "Top movers 2016 → 2026",
      treemap: "Land-use treemap",
      radar: "Land-use radar profile",
      radial: "Multi-arc radial comparison",
      lorenz: "Cumulative concentration curve",
      gauge: "Radial gauge",
      cumulativeAgri: "Farm-plot concentration (Lorenz)",
      cumulativeIndustrial: "Industrial facility concentration (Lorenz)",
      cumulativeUrban: "Urban-block concentration (Lorenz)",
      sectorProfile: "Sector profile (% of total)",
      sectorMix: "Land-use mix",
      landShareDonut: "Sector share of study area",
    },
    common: {
      loading: "Loading…",
      noData: "No data",
      area: "Area",
      name: "Name",
      type: "Type",
      details: "Details",
      growth: "Growth",
      share: "Share",
      period: "Period",
      total: "Total",
      avg: "Average",
      median: "Median",
      largest: "Largest",
      smallest: "Smallest",
      concentration: "Top 10% concentration",
    },
    decisions: {
      title: "Decision-support insights",
      urbanGrowth: "Urban growth",
      agriShrink: "Agricultural change",
      industrialGrowth: "Industrial growth",
    },
    insights: {
      title: "Decision-support insights",
      urbanBoomTitle: "Strong urban boom",
      urbanBoomBody:
        "Urban land nearly doubled between 2016 and 2026, requiring expansion of utilities, transport and public services to keep up with population growth.",
      agriExpandTitle: "Agricultural expansion",
      agriExpandBody:
        "Agricultural land grew significantly, supporting food security and opening opportunities for agro-industry and export.",
      industrialUpTitle: "Industrial investment momentum",
      industrialUpBody:
        "More industrial facilities and area signal investor attractiveness; integrated industrial zones with logistics must be planned.",
      vacantDropTitle: "Vacant land decline",
      vacantDropBody:
        "Falling vacant land means conversion into productive uses (agriculture, industry, urban) — a healthy sign of development along the axis.",
      waterRiskTitle: "Water-body shrinkage",
      waterRiskBody:
        "Reduced water bodies call for reviewing irrigation, drainage and protection of water resources from encroachment.",
      militaryTitle: "Military land repurposing",
      militaryBody:
        "Military zones shrank in favour of civil uses, unlocking opportunities for housing, services and new development projects.",
      densityTitle: "Density per km²",
      densityBody:
        "Feature count grew faster than area, indicating higher building density and the need to revise zoning and height regulations.",
      investmentTitle: "Investment opportunities",
      investmentBody:
        "Newly created and fully changed parcels mark hot spots for real-estate, industrial and service investment along the development axis.",
      fragmentationTitle: "Land fragmentation",
      fragmentationBody:
        "Most plots are small (under 20 feddan), making modern mechanisation hard and calling for land-consolidation or cooperative programs.",
      largePlotsTitle: "Investment-ready large plots",
      largePlotsBody:
        "Plots above 100 feddan unlock opportunities for commercial farming, agro-processing and export-oriented investment.",
      smeIndustrialTitle: "SME-dominated industrial base",
      smeIndustrialBody:
        "Over 70% of facilities are below 0.05 km², calling for industrial incubators and shared services to support value chains.",
      axisCorridorTitle: "Axis-corridor development",
      axisCorridorBody:
        "Urban and industrial change is tightly clustered along the road axis, strengthening logistics and ancillary-service opportunities.",
      residentialDominanceTitle: "Residential-only urban mix",
      residentialDominanceBody:
        "Almost the entire urban expansion is residential — diversifying with commercial, services and offices is needed to serve new residents.",
    },
    story: {
      title: "Change Story 2016 / 2026",
      subtitle: "Swipe through the clearest land-use transformations across Ismailia.",
      carouselTitle: "Key spatial shifts",
      summaryStudyArea: "Study area",
      summaryPeriod: "Comparison period",
      summaryIndicators: "Indicators",
      netChange: "Net change",
      previous: "Previous slide",
      next: "Next slide",
      activeSlide: "Active slide",
      mapWaiting: "Map appears when this slide is active",
      slides: {
        urban: {
          eyebrow: "Urban shift",
          title: "Urban land expanded clearly",
          body: "Urban area increased between 2016 and 2026, signalling higher pressure on services, utilities and mobility networks.",
          impact:
            "Planning should connect new residential growth with daily services, transport access and nearby employment zones.",
        },
        agri: {
          eyebrow: "Agricultural shift",
          title: "Agricultural land grew strongly",
          body: "Agriculture shows a clear expansion, indicating that part of the unused land stock moved into productive use.",
          impact:
            "This supports agro-industry and supply-chain opportunities, while requiring careful irrigation and drainage monitoring.",
        },
        industrial: {
          eyebrow: "Industrial shift",
          title: "Industrial activity gained ground",
          body: "Industrial land increased, creating stronger demand for logistics and supporting services around the main corridors.",
          impact:
            "The best opportunity is to channel industrial growth into planned clusters instead of scattered expansion.",
        },
        vacant: {
          eyebrow: "Vacant-land shift",
          title: "Vacant land declined",
          body: "The drop in vacant land means a large part of the spatial reserve became agricultural, urban or industrial use.",
          impact:
            "This is a positive development signal, but it reduces future optionality and calls for tighter land management.",
        },
        water: {
          eyebrow: "Water shift",
          title: "Water surfaces shrank",
          body: "Water area decreased between 2016 and 2026, a sensitive shift that affects agriculture, ecology and quality of life.",
          impact:
            "This indicator should be reviewed alongside irrigation, drainage and protection of existing water bodies.",
        },
        military: {
          eyebrow: "Land-use shift",
          title: "Military areas eased slightly",
          body: "Military areas declined moderately, opening a planning question around how some sites may be repurposed.",
          impact: "Any reuse should be tied clearly to service, housing and investment needs.",
        },
      },
    },
    changeSamples: {
      title: "Close Change Samples",
      subtitle: "Swipe through selected close-zoom locations comparing 2016 and 2026 land use.",
      carouselTitle: "Spatial samples 2016 / 2026",
      totalSamples: "Samples",
      mode: "Comparison mode",
      sampleMix: "Sample mix",
      mixValue: "Urban, agriculture, industry, water",
      sampleLabel: "Sample",
      changeType: "Change type",
      closeZoom: "Close zoom",
      sampleBoundary: "Sample boundary",
      mapWaiting: "Map appears when this sample is active",
      previous: "Previous sample",
      next: "Next sample",
      kinds: {
        urban: "Urban change",
        agri: "Agricultural change",
        industrial: "Industrial change",
        water: "Water change",
      },
    },
  },
};

export const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  dir: "rtl" | "ltr";
}>({
  lang: "ar",
  setLang: () => {},
  t: dict.ar,
  dir: "rtl",
});

export const useI18n = () => useContext(LangContext);

export function formatNum(n: number, _lang: Lang, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const normalized = Object.is(n, -0) ? 0 : n;

  // Keep figures in Latin digits so signs, separators and units stay stable in RTL layouts.
  return new Intl.NumberFormat("en-US-u-nu-latn", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
    useGrouping: true,
  }).format(normalized);
}
