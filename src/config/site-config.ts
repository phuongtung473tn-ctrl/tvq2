/**
 * ============================================================================
 * SITE CONFIG — Nguồn dữ liệu tĩnh mặc định cho toàn hệ thống Funnel Builder.
 * ----------------------------------------------------------------------------
 * NGƯỜI BIẾT CODE: chỉnh trực tiếp DEFAULT_CONFIG bên dưới rồi deploy.
 * NGƯỜI KHÔNG BIẾT CODE: chỉnh trực quan trong Admin, bấm "LƯU" (localStorage)
 *   hoặc "XUẤT CONFIG" để tải file dán đè vào đây.
 * ============================================================================
 */

export type StorageMode = "local" | "database";

export interface AdminConfig {
  adminPath: string;
  password: string;
  storageMode: StorageMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseAdminEmail: string;
  backupEmail: string;
  cronSchedule: string; // "daily" | "weekly" | "off"
  backupCronToken: string;
}

export interface SitePage {
  id: string;
  title: string;
  path: string;
  kind: "landing" | "thankYou" | "custom";
  enabled: boolean;
  showInMenu: boolean;
  menuOrder: number;
  heading: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  /** Các section custom từ thư viện được hiển thị trên trang này. */
  sectionIds: string[];
}

export interface WebhookEndpoint {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  type: "make" | "telegram" | "sheets" | "supabase" | "custom";
}

export interface TrackingConfig {
  facebookPixelId: string;
  tiktokPixelId: string;
  tiktokAccessToken: string;
  ga4Id: string;
  gtmId: string;
  googleVerification: string;
  customHead: string;
  customBody: string;
  customFooter: string;
  events: {
    pageView: boolean;
    formStart: boolean;
    lead: boolean;
    completeRegistration: boolean;
    click?: boolean;
    scroll?: boolean;
  };
}

export interface SeoConfig {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  faviconUrl: string;
  schemaType: string;
}

export interface FomoConfig {
  enabled: boolean;
  source: "recentLeads" | "sample";
  respectReducedMotion: boolean;
  names: string[];
  cities: string[];
  minDelaySec: number;
  maxDelaySec: number;
  displaySec: number;
  position: "left" | "right";
  template: string; // supports {name} {city} {mins}
}

export interface CountdownConfig {
  enabled: boolean;
  slotsLeft: number;
  autoDecrement: boolean;
  headline: string;
  endMode: "endOfMonth" | "fixed";
  endDate: string; // ISO, used when endMode === "fixed"
}

export interface FloatingContactConfig {
  enabled: boolean;
  hotline: string;
  zalo: string;
  messenger: string;
  animateHotline?: boolean;
  animateMessenger?: boolean;
}

export interface TrafficStatsConfig {
  enabled: boolean;
  position: "footer" | "afterHero";
  title: string;
  helperText: string;
}

export interface FooterConfig {
  logoUrl: string;
  menuLabel: string;
  menuLinks: { label: string; href: string }[];
}

export interface FormField {
  name: string;
  label: string;
  placeholder: string;
  type: "text" | "tel" | "email" | "select";
  required: boolean;
}

export interface FormConfig {
  headline: string;
  ctaLabel: string;
  webhookUrl: string;
  redirectUrl: string;
  rateLimitCount: number;
  rateLimitWindowMin: number;
  fields: FormField[];
}

export interface AiAdvisorConfig {
  enabled: boolean;
  vipDeviceRegex: string;
  keyRegions: string;
  fastFillThresholdSec: number;
  vipTimeOnPageSec: number;
  vipScrollPercent: number;
  weightDevice: number;
  weightRegion: number;
  weightFastFill: number;
  weightTimeOnPage: number;
  weightScroll: number;
  weightReturnVisit: number;
  callScriptTemplate: string;
}

export interface ThemeConfig {
  primary: string;
  gold: string;
  fontHeading: string;
  fontBody: string;
}

export interface LandingConfig {
  sectionsArray: {
    id: string;
    type: string;
    label: string;
    enabled: boolean;
    order: number;
    content?: {
      heading: string;
      body: string;
      imageUrl: string;
      variant?: string;
      buttonLabel: string;
      buttonHref: string;
      backgroundColor?: string;
      textColor?: string;
      accentColor?: string;
    };
  }[];
  brandName: string;
  showLogo: boolean;
  logoUrl: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  heroMediaMode: "image" | "slider";
  heroImageUrl: string;
  heroSliderImages: string[];
  heroSliderIntervalMs: number;
  galleryImageUrls: string[];
  expertImageUrls: string[];
  heroTrustItems: string[];
  heroCtaLabel: string;
  stats: { value: string; label: string }[];
  painHeading: string;
  pains: string[];
  benefitsHeading: string;
  benefits: { stat: string; title: string; text: string }[];
  majorsHeading: string;
  majorsDescription: string;
  majorNames: string[];
  majorIcons: string[];
  majorDescriptions: string[];
  expertsHeading: string;
  expertsDescription: string;
  experts: { name: string; role: string; bio: string; experience: string }[];
  galleryHeading: string;
  galleryDescription: string;
  galleryCaptions: string[];
  testimonialsHeading: string;
  testimonials: {
    name: string;
    meta: string;
    text: string;
    avatarUrl?: string;
  }[];
  stepsHeading: string;
  steps: { number: string; title: string; description: string }[];
  faqHeading: string;
  faqs: { slug: string; question: string; answer: string }[];
  finalCtaHeading: string;
  finalCtaDescription: string;
}

export interface SiteConfig {
  admin: AdminConfig;
  pages: SitePage[];
  tracking: TrackingConfig;
  seo: SeoConfig;
  theme: ThemeConfig;
  landing: LandingConfig;
  fomo: FomoConfig;
  countdown: CountdownConfig;
  floatingContact: FloatingContactConfig;
  trafficStats: TrafficStatsConfig;
  footer: FooterConfig;
  form: FormConfig;
  aiAdvisor: AiAdvisorConfig;
  webhooks: WebhookEndpoint[];
  emailAutomation: {
    enabled: boolean;
    provider: "resend" | "gmail";
    fromEmail: string;
    notifyEmail: string;
    resendApiKey: string;
    gmailClientId: string;
    gmailClientSecret: string;
    gmailRefreshToken: string;
    subject: string;
    body: string;
    notifySubject: string;
    notifyBody: string;
  };
  abTest: {
    enabled: boolean;
    split: number; // % to variant B
    variantALabel: string;
    variantBLabel: string;
    variantAHeadline: string;
    variantBHeadline: string;
    variantACta: string;
    variantBCta: string;
  };
}

export const DEFAULT_CONFIG: SiteConfig = {
  admin: {
    adminPath: "admin",
    password: "",
    storageMode: "database",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseAdminEmail: "",
    backupEmail: "",
    cronSchedule: "off",
    backupCronToken: "",
  },
  pages: [
    {
      id: "home",
      title: "Trang chủ",
      path: "",
      kind: "landing",
      enabled: true,
      showInMenu: true,
      menuOrder: 0,
      heading: "",
      description: "",
      ctaLabel: "",
      ctaHref: "#dang-ky",
      sectionIds: [],
    },
    {
      id: "thank-you",
      title: "Cảm ơn",
      path: "cam-on",
      kind: "thankYou",
      enabled: true,
      showInMenu: false,
      menuOrder: 1,
      heading: "Cảm ơn bạn đã đăng ký!",
      description:
        "Thông tin đã được ghi nhận. Tư vấn viên sẽ liên hệ với bạn trong thời gian sớm nhất.",
      ctaLabel: "Về trang chủ",
      ctaHref: "/",
      sectionIds: [],
    },
  ],
  tracking: {
    facebookPixelId: "",
    tiktokPixelId: "DAILRC3C77U3EDHHCGUG",
    tiktokAccessToken: "",
    ga4Id: "",
    gtmId: "",
    googleVerification: "",
    customHead: "",
    customBody: "",
    customFooter: "",
    events: {
      pageView: true,
      formStart: true,
      lead: true,
      completeRegistration: true,
      click: true,
      scroll: true,
    },
  },
  seo: {
    title: "Du học nghề Trung Quốc 2026 — Học bổng miễn phí KTX, cam kết Visa",
    description:
      "Chương trình du học nghề Trung Quốc trọn gói: học bổng miễn 100% KTX, vừa học vừa làm lương 15-25 triệu/tháng, cam kết Visa 100%. Đăng ký tư vấn miễn phí.",
    keywords:
      "du học nghề trung quốc, học bổng trung quốc, du học vừa học vừa làm",
    ogImage: "/og-image.jpg",
    faviconUrl: "/favicon.ico",
    schemaType: "EducationalOrganization",
  },
  theme: {
    primary: "#c0392b",
    gold: "#d4af37",
    fontHeading: "Be Vietnam Pro",
    fontBody: "Be Vietnam Pro",
  },
  landing: {
    sectionsArray: [
      { id: "hero", type: "hero", label: "Hero", enabled: true, order: 0 },
      { id: "stats", type: "stats", label: "Stats", enabled: true, order: 1 },
      {
        id: "pains",
        type: "pains",
        label: "Pain points",
        enabled: true,
        order: 2,
      },
      {
        id: "benefits",
        type: "benefits",
        label: "Benefits",
        enabled: true,
        order: 3,
      },
      {
        id: "majors",
        type: "majors",
        label: "Ngành học",
        enabled: true,
        order: 4,
      },
      {
        id: "experts",
        type: "experts",
        label: "Chuyên gia",
        enabled: true,
        order: 5,
      },
      {
        id: "gallery",
        type: "gallery",
        label: "Gallery",
        enabled: true,
        order: 6,
      },
      {
        id: "testimonials",
        type: "testimonials",
        label: "Testimonials",
        enabled: true,
        order: 7,
      },
      {
        id: "steps",
        type: "steps",
        label: "Lộ trình",
        enabled: true,
        order: 8,
      },
      { id: "faq", type: "faq", label: "FAQ", enabled: true, order: 9 },
      {
        id: "finalCta",
        type: "finalCta",
        label: "CTA cuối",
        enabled: true,
        order: 10,
      },
    ],
    brandName: "Trung tâm Hướng nghiệp & Phát triển Sự nghiệp Quốc tế",
    showLogo: true,
    logoUrl: "",
    heroEyebrow: "Tuyển sinh kỳ tháng 3 & tháng 9",
    heroTitle: "5 năm nữa bạn vẫn muốn đứng ở vị trí",
    heroHighlight: "công nhân lặp đi lặp lại?",
    heroDescription:
      "Du học nghề Trung Quốc: học phí 0Đ, vừa học vừa làm lương 15-30 triệu/tháng, ra trường có bằng Cao đẳng chính quy quốc tế và tay nghề công nghệ cao.",
    heroMediaMode: "image",
    heroImageUrl: "",
    heroSliderImages: [],
    heroSliderIntervalMs: 4500,
    galleryImageUrls: ["", "", "", ""],
    expertImageUrls: ["", "", ""],
    heroTrustItems: [
      "Không chứng minh tài chính",
      "Không cần tiếng Hán trước",
      "Xét hồ sơ tốt nghiệp THPT",
      "Hỗ trợ trọn gói tới khi nhập học",
    ],
    heroCtaLabel: "Đăng ký nhận lộ trình 0Đ",
    stats: [
      { value: "100%", label: "Học viên có việc làm khi thực tập" },
      { value: "15-30tr", label: "Thu nhập mỗi tháng khi vừa học vừa làm" },
      { value: "8", label: "Ngành công nghệ đang khát nhân lực" },
      { value: "0Đ", label: "Học phí trong toàn bộ khóa học" },
    ],
    painHeading: "Nếu bạn đang gặp một trong ba điều này, bạn cần đọc tiếp",
    pains: [
      "Làm công nhân 10-12 tiếng/ngày, lương không tăng, tay nghề không lên.",
      "Không có bằng cấp quốc tế nên mãi không thoát khỏi vị trí lao động phổ thông.",
      "Muốn đi nước ngoài nhưng sợ chi phí hàng trăm triệu và rủi ro môi giới.",
    ],
    benefitsHeading: "4 lợi ích vàng của chương trình",
    benefits: [
      {
        stat: "0Đ",
        title: "Học phí bằng 0",
        text: "Doanh nghiệp Trung Quốc tài trợ toàn bộ học phí theo chương trình liên kết đào tạo nhân lực.",
      },
      {
        stat: "80%",
        title: "80% thực hành",
        text: "Chỉ 20% lý thuyết. Bạn làm việc trực tiếp trên dây chuyền, máy móc và công nghệ mới nhất.",
      },
      {
        stat: "15-30tr",
        title: "Lương cứng mỗi tháng",
        text: "Vừa học vừa làm, thu nhập 15-30 triệu/tháng, đủ chi phí sinh hoạt và gửi về gia đình.",
      },
      {
        stat: "Bằng",
        title: "Cao đẳng chính quy quốc tế",
        text: "Bằng Cao đẳng chính quy được công nhận quốc tế, mở đường ở lại làm việc hoặc học tiếp.",
      },
    ],
    majorsHeading: "8 ngành nghề phát triển trong 5-20 năm tới",
    majorsDescription:
      "Các lựa chọn bám sát chuyển dịch công nghệ, sản xuất và thương mại giữa Việt Nam – Trung Quốc.",
    majorNames: [
      "Công nghệ Ô tô điện",
      "Công nghệ Drone (UAV)",
      "Thương mại điện tử",
      "Logistics & Chuỗi cung ứng",
      "Kỹ thuật Điện tử",
      "IoT - Internet vạn vật",
      "Cơ khí tự động hóa",
      "Hán ngữ thương mại",
    ],
    majorIcons: ["🚗", "🛸", "🛒", "🚚", "🔌", "📡", "⚙️", "🀄"],
    majorDescriptions: [
      "Đón đầu xu hướng điện hóa giao thông, pin thế hệ mới và hệ sinh thái xe thông minh.",
      "Phát triển cùng nhu cầu UAV trong nông nghiệp, vận chuyển, khảo sát và cứu hộ.",
      "Mở rộng theo thương mại xuyên biên giới, bán hàng đa kênh và vận hành bằng dữ liệu.",
      "Giữ vai trò cốt lõi khi chuỗi cung ứng khu vực ngày càng tự động hóa và kết nối sâu.",
      "Là nền tảng cho thiết bị thông minh, năng lượng sạch, robot và sản xuất công nghệ cao.",
      "Kết nối nhà máy, đô thị và thiết bị thông minh trong nền kinh tế số tương lai.",
      "Thúc đẩy nhà máy thông minh, robot cộng tác và dây chuyền sản xuất ít phụ thuộc lao động tay chân.",
      "Tạo lợi thế trong thương mại, dịch vụ và hợp tác doanh nghiệp Việt Nam – Trung Quốc.",
    ],
    expertsHeading: "Đội ngũ chuyên gia tư vấn",
    expertsDescription:
      "Đồng hành từ lúc chọn ngành, chuẩn bị hồ sơ đến khi học viên sẵn sàng nhập học.",
    experts: [
      {
        name: "Ths. Nguyễn Thu Hương",
        role: "Chuyên gia định hướng ngành học",
        bio: "Tập trung đánh giá năng lực, sở thích và mục tiêu dài hạn để giúp học viên chọn ngành phù hợp.",
        experience:
          "Kinh nghiệm tư vấn lộ trình học nghề quốc tế và định hướng nghề nghiệp sau tốt nghiệp.",
      },
      {
        name: "Ông Lê Quang Vinh",
        role: "Chuyên gia hồ sơ & tuyển sinh",
        bio: "Đồng hành cùng học viên từ bước rà soát điều kiện đến hoàn thiện hồ sơ nhập học và visa.",
        experience:
          "Kinh nghiệm xử lý hồ sơ tuyển sinh, thủ tục du học và chuẩn bị trước khi xuất cảnh.",
      },
      {
        name: "Cô Phạm Minh Anh",
        role: "Chuyên gia đồng hành học viên",
        bio: "Hỗ trợ học viên chuẩn bị ngôn ngữ, kỹ năng thích nghi và kế hoạch học tập tại Trung Quốc.",
        experience:
          "Kinh nghiệm đào tạo kỹ năng tiền du học và hỗ trợ học viên trong quá trình hòa nhập.",
      },
    ],
    galleryHeading: "Hình ảnh thực tế: visa, trường học & ký túc xá",
    galleryDescription:
      "Ảnh từ các khóa học viên đã bay và trường đối tác tại Trung Quốc.",
    galleryCaptions: [
      "Visa du học sinh đã được cấp cho học viên khóa gần nhất",
      "Khuôn viên trường Cao đẳng nghề đối tác tại Trung Quốc",
      "Phòng ký túc xá trong trường — miễn 100% phí ở",
      "Học viên lên đường nhập học kỳ tháng 9",
    ],
    testimonialsHeading: "Học viên đi trước nói gì",
    testimonials: [
      {
        name: "Nguyễn Văn Hùng",
        meta: "Ngành Ô tô điện · Quảng Châu · khóa tháng 9",
        text: "Trước em làm xưởng gỗ 7 triệu/tháng. Sang đây vừa học vừa làm được hơn 20 triệu, tháng nào cũng gửi về nhà 10 triệu. Tay nghề lên hẳn vì được làm trên xe thật.",
        avatarUrl: "",
      },
      {
        name: "Trần Thị Ngọc",
        meta: "Ngành Thương mại điện tử · Nghĩa Ô",
        text: "Em không biết tiếng Hán, được học nền tảng trước khi bay nên sang không bị choáng. Giờ em phụ trách livestream cho một shop, thu nhập ổn định.",
        avatarUrl: "",
      },
      {
        name: "Lê Đình Phúc",
        meta: "Ngành Drone (UAV) · Thâm Quyến",
        text: "Nhà em không đủ tiền cho đi du học tự túc. Chương trình 0Đ giúp em học ngành công nghệ mà chi phí ban đầu rất nhẹ. Ra trường có bằng Cao đẳng chính quy.",
        avatarUrl: "",
      },
    ],
    stepsHeading: "Lộ trình 4 bước đơn giản",
    steps: [
      {
        number: "01",
        title: "Đăng ký & tư vấn 1:1",
        description:
          "Điền form, chuyên viên gọi lại trong 30 phút, gửi lộ trình chi tiết.",
      },
      {
        number: "02",
        title: "Chọn ngành & xét hồ sơ",
        description:
          "Chọn 1 trong 8 ngành hot, hoàn thiện hồ sơ theo hướng dẫn từng bước.",
      },
      {
        number: "03",
        title: "Học tiếng Hán & định hướng",
        description: "Đào tạo tiếng Hán nền tảng và kỹ năng trước khi bay.",
      },
      {
        number: "04",
        title: "Nhập học & bắt đầu kiếm tiền",
        description:
          "Sang trường đối tác, học nghề và làm việc có lương ngay từ kỳ đầu.",
      },
    ],
    faqHeading: "Câu hỏi thường gặp",
    faqs: [
      {
        slug: "hoc_phi",
        question: "Du học nghề Trung Quốc học phí 0Đ có thật không?",
        answer:
          "Có. Học phí được doanh nghiệp Trung Quốc tài trợ theo chương trình liên kết đào tạo nhân lực. Học viên chỉ cần chuẩn bị chi phí hồ sơ, vé máy bay và sinh hoạt ban đầu; phần này được tư vấn minh bạch trước khi đăng ký.",
      },
      {
        slug: "tieng_trung",
        question: "Điều kiện tham gia gồm những gì?",
        answer:
          "Tốt nghiệp THPT (hoặc tương đương), độ tuổi 18-28, sức khỏe tốt. Không cần chứng minh tài chính và không yêu cầu biết tiếng Hán trước — học viên được đào tạo tiếng Hán nền tảng trước khi bay.",
      },
      {
        slug: "luong_thuc_tap",
        question: "Vừa học vừa làm thì lương bao nhiêu và có đủ sống không?",
        answer:
          "Thu nhập thực tập tại doanh nghiệp đối tác thường 15-30 triệu đồng/tháng tùy ngành và ca làm. Mức này đủ trang trải sinh hoạt, ký túc xá và còn dư gửi về gia đình.",
      },
      {
        slug: "bang_cap",
        question: "Bằng tốt nghiệp có được công nhận không?",
        answer:
          "Học viên nhận bằng Cao đẳng chính quy của trường tại Trung Quốc, được công nhận quốc tế, có thể ở lại làm việc, học liên thông lên Đại học hoặc về Việt Nam làm cho doanh nghiệp FDI.",
      },
      {
        slug: "thoi_gian",
        question: "Thời gian nhập học và quy trình mất bao lâu?",
        answer:
          "Có hai kỳ nhập học mỗi năm: tháng 3 và tháng 9. Từ lúc đăng ký tới khi bay thường 3-5 tháng, gồm xét hồ sơ, học tiếng Hán và làm thủ tục visa.",
      },
      {
        slug: "nganh_hoc",
        question: "Ngành nào đang cần nhiều nhân lực nhất?",
        answer:
          "Công nghệ ô tô điện, công nghệ drone (UAV), IoT và logistics là các ngành tuyển nhiều nhất, đồng thời có mức lương thực tập cao nhất trong 8 ngành của chương trình.",
      },
    ],
    finalCtaHeading: "Đổi 30 giây hôm nay cho 5 năm tới của bạn",
    finalCtaDescription:
      "Nhận lộ trình chi tiết, danh sách trường và mức lương thực tế theo từng ngành — hoàn toàn 0Đ.",
  },
  fomo: {
    enabled: true,
    source: "recentLeads",
    respectReducedMotion: true,
    names: [
      "Trần Văn Nam",
      "Nguyễn Thị Hà",
      "Lê Minh Quân",
      "Phạm Thu Trang",
      "Hoàng Văn Dũng",
      "Đỗ Thị Mai",
      "Vũ Đức Anh",
      "Bùi Thanh Tùng",
      "Ngô Thị Lan",
      "Đặng Hữu Phước",
    ],
    cities: [
      "Bình Dương",
      "Hà Nội",
      "Bắc Giang",
      "Nghệ An",
      "Thanh Hóa",
      "Hải Phòng",
      "Đồng Nai",
      "Thái Nguyên",
      "Cần Thơ",
      "Đắk Lắk",
    ],
    minDelaySec: 10,
    maxDelaySec: 18,
    displaySec: 5,
    position: "left",
    template: "{name} ({city}) vừa đăng ký nhận tư vấn",
  },
  countdown: {
    enabled: true,
    slotsLeft: 12,
    autoDecrement: true,
    headline: "suất học bổng miễn 100% KTX tháng này",
    endMode: "endOfMonth",
    endDate: "",
  },
  floatingContact: {
    enabled: true,
    hotline: "0900000000",
    zalo: "https://zalo.me/0900000000",
    messenger: "",
    animateHotline: true,
    animateMessenger: true,
  },
  trafficStats: {
    enabled: true,
    position: "footer",
    title: "Thống kê truy cập thông minh",
    helperText:
      "Dữ liệu truy cập được gom từ cùng một kho tracking để đồng bộ giữa Analytics, Mini-CRM và Webhook.",
  },
  footer: {
    logoUrl: "",
    menuLabel: "Liên kết nhanh",
    menuLinks: [
      { label: "Đăng ký tư vấn", href: "#dang-ky-cuoi" },
      { label: "Câu hỏi thường gặp", href: "#faq" },
    ],
  },
  form: {
    headline: "Đăng ký nhận tư vấn miễn phí",
    ctaLabel: "ĐĂNG KÝ NGAY",
    webhookUrl: "https://hook.us2.make.com/jtwmjkp2t8wrlr4f080ppgc84u3e53aa",
    redirectUrl: "",
    rateLimitCount: 3,
    rateLimitWindowMin: 5,
    fields: [
      {
        name: "name",
        label: "Họ và tên",
        placeholder: "Nguyễn Văn A",
        type: "text",
        required: true,
      },
      {
        name: "phone",
        label: "Số điện thoại",
        placeholder: "09xx xxx xxx",
        type: "tel",
        required: true,
      },
      {
        name: "email",
        label: "Email (không bắt buộc)",
        placeholder: "email@example.com",
        type: "email",
        required: false,
      },
      {
        name: "city",
        label: "Tỉnh/Thành phố",
        placeholder: "Chọn tỉnh/thành",
        type: "select",
        required: true,
      },
      {
        name: "major",
        label: "Ngành học quan tâm",
        placeholder: "Chọn ngành",
        type: "select",
        required: true,
      },
    ],
  },
  aiAdvisor: {
    enabled: true,
    vipDeviceRegex:
      "iPhone (13|14|15|16) Pro|Pro Max|Galaxy S(22|23|24)|Fold|Flip",
    keyRegions: "Nghệ An|Hà Tĩnh|Quảng Bình|Thanh Hóa|Quảng Ninh|Hải Phòng",
    fastFillThresholdSec: 4,
    vipTimeOnPageSec: 80,
    vipScrollPercent: 70,
    weightDevice: 20,
    weightRegion: 15,
    weightFastFill: 15,
    weightTimeOnPage: 20,
    weightScroll: 15,
    weightReturnVisit: 15,
    callScriptTemplate:
      "Chào {name}, em gọi từ chương trình du học nghề Trung Quốc. Em thấy anh/chị ở {city}, quan tâm ngành {major}. Dựa trên hành vi online, em đánh giá khách là {ai_rank} (score {ai_score}). Gợi ý: {sale_advice}",
  },
  webhooks: [],
  emailAutomation: {
    enabled: false,
    provider: "resend",
    fromEmail: "",
    notifyEmail: "",
    resendApiKey: "",
    gmailClientId: "",
    gmailClientSecret: "",
    gmailRefreshToken: "",
    subject: "Cảm ơn {name} đã đăng ký tư vấn du học nghề Trung Quốc",
    body: "Chào {name},\n\nCảm ơn bạn đã để lại thông tin. Đội ngũ tư vấn sẽ liên hệ số {phone} trong thời gian sớm nhất.\n\nTrân trọng.",
    notifySubject: "[Lead mới] {name} — {phone} — {city}",
    notifyBody:
      "Lead mới vừa đăng ký:\n\nHọ tên: {name}\nSĐT: {phone}\nTỉnh: {city}\nNgành: {major}\nAI Score: {ai_score}\nNguồn: {source}",
  },
  abTest: {
    enabled: false,
    split: 50,
    variantALabel: "Variant A",
    variantBLabel: "Variant B",
    variantAHeadline: "",
    variantBHeadline: "",
    variantACta: "",
    variantBCta: "",
  },
};
