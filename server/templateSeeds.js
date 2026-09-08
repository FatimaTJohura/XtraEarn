/**
 * XtraEarn Dynamic Task Template Seeds Catalog
 * 12 Articulated Domain Templates with rigid field_key schemas, conditional logic, and versioning.
 */

const TEMPLATE_SEEDS = [
  // 1. E-COMMERCE → PRODUCT LISTING
  {
    id: 101,
    title: 'E-commerce Product Listing & Catalog Upload',
    slug: 'ecommerce-product-listing',
    category_id: 11,
    category_name: 'E-commerce',
    subcategory: 'Product Listing',
    emoji: '🛒',
    task_type: 'online',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 350,
    suggested_budget_min: 250,
    suggested_budget_max: 700,
    duration_minutes: 45,
    delivery_hours: 48,
    short_desc: 'Upload, format, and optimize product listings on Shopify, Daraz, WooCommerce, or Amazon.',
    instructions: 'Upload products with high-converting titles, bullet-point features, optimized descriptions, accurate pricing, SKU tags, and high-res image formatting.',
    deliverables: [
      'Published active product listings verified on store backend',
      'Summary catalog sheet with direct product URLs and SKU mappings'
    ],
    skills: 'product-listing, ecommerce, shopify, woocommerce, daraz, excel',
    tags: 'product listing, ecommerce, shopify, daraz, catalog upload',
    fields: [
      {
        field_key: 'platform',
        type: 'dropdown',
        label: 'Store Platform',
        description: 'Where will the products be listed?',
        required: true,
        order: 1,
        default_value: 'shopify',
        options: [
          { value: 'shopify', label: 'Shopify Store' },
          { value: 'woocommerce', label: 'WooCommerce / WordPress' },
          { value: 'daraz', label: 'Daraz Seller Center' },
          { value: 'amazon', label: 'Amazon Seller Central' },
          { value: 'other', label: 'Other Platform' }
        ],
        help_text: 'Select your target marketplace or CMS.'
      },
      {
        field_key: 'other_platform_name',
        type: 'text',
        label: 'Platform Name',
        placeholder: 'e.g. Magento, BigCommerce, Custom Web Store',
        required: true,
        order: 2,
        conditions: [
          { field_key: 'platform', operator: 'equals', value: 'other' }
        ]
      },
      {
        field_key: 'number_of_products',
        type: 'number',
        label: 'Number of Products',
        description: 'How many individual product listings do you need uploaded?',
        placeholder: 'e.g. 25',
        required: true,
        order: 3,
        default_value: 20,
        min: 1,
        max: 5000,
        help_text: 'Specify total unique products or variations.'
      },
      {
        field_key: 'product_info_provided',
        type: 'multi-select',
        label: 'Product Information You Will Provide',
        description: 'Check all assets you already have prepared:',
        required: true,
        order: 4,
        default_value: ['title', 'price', 'description'],
        options: [
          { value: 'title', label: 'Product Titles' },
          { value: 'description', label: 'Descriptions & Bullet Points' },
          { value: 'price', label: 'Prices & Discount Rules' },
          { value: 'sku', label: 'SKU / Barcodes' },
          { value: 'category', label: 'Categories & Tag Taxonomies' },
          { value: 'attributes', label: 'Variants (Sizes, Colors, Materials)' }
        ]
      },
      {
        field_key: 'product_images_status',
        type: 'dropdown',
        label: 'Product Images Readiness',
        required: true,
        order: 5,
        default_value: 'images_provided',
        options: [
          { value: 'images_provided', label: '📸 Images Provided & Ready to Upload' },
          { value: 'editing_required', label: '✂️ Image Editing Required (Background removal, watermark, resize)' },
          { value: 'source_from_web', label: '🔍 Worker to Source / Capture Images from Supplier' }
        ]
      },
      {
        field_key: 'image_editing_instructions',
        type: 'textarea',
        label: 'Image Editing Guidelines',
        placeholder: 'e.g. Pure white background (#FFFFFF), 1000x1000 square, add our brand logo watermark in bottom right corner',
        required: false,
        order: 6,
        conditions: [
          { field_key: 'product_images_status', operator: 'equals', value: 'editing_required' }
        ]
      },
      {
        field_key: 'store_access',
        type: 'radio',
        label: 'Store Access Method',
        required: true,
        order: 7,
        default_value: 'will_provide',
        options: [
          { value: 'will_provide', label: 'I will provide store collaborator / staff account access' },
          { value: 'csv_delivery', label: 'No store access — deliver structured CSV / Excel import file' }
        ]
      },
      {
        field_key: 'additional_requirements',
        type: 'textarea',
        label: 'Special Instructions / Requirements',
        placeholder: 'Any specific SEO keyword requirements, return policy text, or custom shipping profile guidelines...',
        required: false,
        order: 8
      }
    ],
    conditional_rules: []
  },

  // 2. DESIGN & CREATIVE → LOGO & BRANDING
  {
    id: 102,
    title: 'Custom Brand Logo Design & Vector Identity',
    slug: 'custom-logo-brand-identity',
    category_id: 1,
    category_name: 'Design & Creative',
    subcategory: 'Logo & Branding',
    emoji: '🎨',
    task_type: 'online',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 450,
    suggested_budget_min: 300,
    suggested_budget_max: 1200,
    duration_minutes: 60,
    delivery_hours: 48,
    short_desc: 'Unique, high-resolution vector logo design tailored to your brand values.',
    instructions: 'Create 2 to 3 distinct concept directions. Refine chosen concept with brand color codes (HEX/RGB) and typography pairings.',
    deliverables: [
      'Editable Vector Master Files (AI, SVG, EPS)',
      'High-Resolution Transparent PNG (4K) & JPEG',
      'Brand Color Palette codes (HEX, RGB, CMYK)'
    ],
    skills: 'logo-design, vector-art, illustrator, brand-identity, typography',
    tags: 'logo design, branding, vector, creative, graphic design',
    fields: [
      {
        field_key: 'brand_name',
        type: 'text',
        label: 'Brand / Business Name',
        placeholder: 'e.g. Apex Nova Logistics',
        required: true,
        order: 1,
        help_text: 'Exact spelling and capitalization to use in the logo.'
      },
      {
        field_key: 'brand_tagline',
        type: 'text',
        label: 'Tagline / Slogan (Optional)',
        placeholder: 'e.g. Speed & Trust Worldwide',
        required: false,
        order: 2
      },
      {
        field_key: 'has_existing_logo',
        type: 'toggle',
        label: 'Do you have an existing logo to redesign?',
        description: 'Toggle on if this is a logo redesign or modern refresh.',
        required: false,
        order: 3,
        default_value: false
      },
      {
        field_key: 'logo_style',
        type: 'dropdown',
        label: 'Preferred Logo Style',
        required: true,
        order: 4,
        default_value: 'minimal',
        options: [
          { value: 'minimal', label: 'Minimal & Modern (Clean, flat, iconic)' },
          { value: 'wordmark', label: 'Wordmark / Monogram (Custom Typography)' },
          { value: 'mascot', label: 'Mascot / Character (Illustrated emblem)' },
          { value: 'vintage', label: 'Vintage / Retro Badge' },
          { value: 'abstract', label: 'Abstract & Geometric Symbol' },
          { value: '3d_gradient', label: 'Modern 3D Gradient' }
        ]
      },
      {
        field_key: 'preferred_colors',
        type: 'text',
        label: 'Preferred Color Palette',
        placeholder: 'e.g. Emerald Green & Navy Blue, or give specific HEX codes like #10B981',
        required: false,
        order: 5
      },
      {
        field_key: 'concept_count',
        type: 'dropdown',
        label: 'Number of Concept Directions',
        required: true,
        order: 6,
        default_value: '2',
        options: [
          { value: '1', label: '1 Strong Concept ($)' },
          { value: '2', label: '2 Diverse Concepts ($$ - Recommended)' },
          { value: '3', label: '3 Distinct Creative Directions ($$$)' },
          { value: '5', label: '5 Comprehensive Variations (VIP Premium)' }
        ]
      },
      {
        field_key: 'required_formats',
        type: 'multi-select',
        label: 'Required File Formats',
        required: true,
        order: 7,
        default_value: ['ai', 'svg', 'png'],
        options: [
          { value: 'ai', label: 'Adobe Illustrator (.AI)' },
          { value: 'svg', label: 'Scalable Vector (.SVG)' },
          { value: 'eps', label: 'Print EPS (.EPS)' },
          { value: 'png', label: 'Transparent PNG (4K)' },
          { value: 'pdf', label: 'Vector PDF' }
        ]
      },
      {
        field_key: 'source_files_required',
        type: 'toggle',
        label: 'Vector Source Files Required (AI, SVG, EPS)',
        description: 'Requires worker to provide editable vector master files upon completion.',
        required: false,
        order: 7,
        default_value: true
      },
      {
        field_key: 'target_audience',
        type: 'textarea',
        label: 'Target Audience & Brand Description',
        placeholder: 'Describe your typical customer demographic, industry sector, and core company values...',
        required: false,
        order: 8
      }
    ],
    conditional_rules: []
  },

  // 3. AI & MACHINE LEARNING → IMAGE ANNOTATION
  {
    id: 103,
    title: 'Computer Vision Image Annotation & Dataset Labeling',
    slug: 'ai-image-annotation-dataset',
    category_id: 6,
    category_name: 'AI & Machine Learning',
    subcategory: 'Image Annotation',
    emoji: '🤖',
    task_type: 'online',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 400,
    suggested_budget_min: 250,
    suggested_budget_max: 1500,
    duration_minutes: 60,
    delivery_hours: 48,
    short_desc: 'High-precision bounding box, polygon, or keypoint annotation for AI model training.',
    instructions: 'Label target objects according to strict boundary rules. Ensure tight contours, correct class labels, and zero duplicate bounding boxes.',
    deliverables: [
      'Exported dataset in requested schema (COCO, YOLO, VOC)',
      'QC validation report with precision/recall statistics'
    ],
    skills: 'image-annotation, ai-training, cvat, yolo, coco, labelimg',
    tags: 'ai annotation, image labeling, computer vision, bounding box, yolo',
    fields: [
      {
        field_key: 'dataset_volume',
        type: 'number',
        label: 'Number of Images to Annotate',
        description: 'Total images in your dataset batch',
        placeholder: 'e.g. 500',
        required: true,
        order: 1,
        default_value: 100,
        min: 10,
        max: 50000
      },
      {
        field_key: 'annotation_type',
        type: 'dropdown',
        label: 'Annotation Type',
        required: true,
        order: 2,
        default_value: 'bounding_box',
        options: [
          { value: 'bounding_box', label: '📦 2D Bounding Boxes (Rectangles)' },
          { value: 'polygon', label: '🔺 Polygon Segmentation (Precise outlines)' },
          { value: 'semantic_seg', label: '🎨 Semantic Segmentation (Pixel mask)' },
          { value: 'keypoints', label: '🦴 Keypoints & Skeletal Pose' },
          { value: 'classification', label: '🏷️ Image-Level Classification / Tagging' }
        ]
      },
      {
        field_key: 'dataset_format',
        type: 'dropdown',
        label: 'Export Dataset Format',
        required: true,
        order: 3,
        default_value: 'yolo',
        options: [
          { value: 'yolo', label: 'YOLO (.txt normalized coordinates)' },
          { value: 'coco', label: 'COCO JSON (Instances format)' },
          { value: 'pascal_voc', label: 'Pascal VOC XML' },
          { value: 'csv', label: 'CSV / Excel Table' },
          { value: 'custom_json', label: 'Custom JSON Schema' }
        ]
      },
      {
        field_key: 'annotation_tool',
        type: 'dropdown',
        label: 'Required Annotation Tool',
        required: true,
        order: 4,
        default_value: 'cvat',
        options: [
          { value: 'cvat', label: 'CVAT (Computer Vision Annotation Tool)' },
          { value: 'roboflow', label: 'Roboflow' },
          { value: 'labelimg', label: 'LabelImg' },
          { value: 'labelme', label: 'Labelme' },
          { value: 'any_tool', label: 'Any tool as long as export format matches' }
        ]
      },
      {
        field_key: 'accuracy_requirement',
        type: 'dropdown',
        label: 'Quality & Accuracy Benchmark',
        required: true,
        order: 5,
        default_value: '98_pct',
        options: [
          { value: '95_pct', label: '95% Standard Quality Threshold' },
          { value: '98_pct', label: '98% High Precision (Double-checked)' },
          { value: '99_pct', label: '99.5% Gold Standard (Triple verification)' }
        ]
      },
      {
        field_key: 'sample_dataset_url',
        type: 'url',
        label: 'Dataset Download Link (Drive / Dropbox / S3)',
        placeholder: 'https://drive.google.com/drive/folders/...',
        required: false,
        order: 6
      },
      {
        field_key: 'annotation_guidelines',
        type: 'textarea',
        label: 'Classes & Labeling Guidelines',
        placeholder: 'List all classes (e.g. Car, Pedestrian, TrafficLight) and specific edge-case rules...',
        required: true,
        order: 7
      }
    ],
    conditional_rules: []
  },

  // 4. HOME REPAIR & HANDYMAN → PLUMBING (PHYSICAL)
  {
    id: 104,
    title: 'Emergency Plumbing Repair & Fixture Service',
    slug: 'emergency-plumbing-repair',
    category_id: 12,
    category_name: 'Home Repair & Handyman',
    subcategory: 'Plumbing',
    emoji: '🔧',
    task_type: 'physical',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 350,
    suggested_budget_min: 200,
    suggested_budget_max: 1200,
    duration_minutes: 60,
    delivery_hours: 6,
    short_desc: 'On-site diagnosis and repair of pipe leaks, taps, commode flush, or drain blockage.',
    instructions: 'Diagnose issue on-site, test pressure, replace faulty gaskets or fittings, and test for 100% leak-free operation before sign-off.',
    deliverables: [
      'Resolved leak / unclogged fixture verified on-site',
      'Test run showing zero seepage and full water pressure'
    ],
    skills: 'plumbing, handyman, pipe-repair, sanitary, leak-detection',
    tags: 'plumbing, water leak, tap repair, handyman, physical help',
    fields: [
      {
        field_key: 'issue_type',
        type: 'dropdown',
        label: 'Plumbing Issue Category',
        required: true,
        order: 1,
        default_value: 'tap_leak',
        options: [
          { value: 'tap_leak', label: '🚰 Tap / Faucet Leak or Seepage' },
          { value: 'pipe_burst', label: '💥 Pipe Burst / Concealed Line Crack' },
          { value: 'drain_clog', label: '🚿 Drain / Sink / Sewer Line Blockage' },
          { value: 'commode_cistern', label: '🚽 Toilet / Commode Flush Tank Malfunction' },
          { value: 'geyser_water_heater', label: '🔥 Geyser / Water Heater Connection Leak' },
          { value: 'motor_pump', label: '⚡ Water Motor Pump & Float Valve Issue' },
          { value: 'new_installation', label: '🛠️ New Sanitary Fixture Installation' }
        ]
      },
      {
        field_key: 'leak_location',
        type: 'text',
        label: 'Specific Location in House',
        placeholder: 'e.g. Master bathroom under-sink basin / Kitchen sink drain pipe',
        required: true,
        order: 2
      },
      {
        field_key: 'fixture_count',
        type: 'number',
        label: 'Number of Fixtures / Points',
        required: true,
        order: 3,
        default_value: 1,
        min: 1,
        max: 20
      },
      {
        field_key: 'is_active_leak',
        type: 'toggle',
        label: 'Is water continuously leaking right now?',
        description: 'Toggle on if emergency water isolation is needed immediately.',
        required: false,
        order: 4,
        default_value: true
      },
      {
        field_key: 'materials_provided',
        type: 'radio',
        label: 'Materials / Parts Status',
        required: true,
        order: 5,
        default_value: 'need_advice',
        options: [
          { value: 'need_advice', label: 'Worker should inspect and tell me what parts to buy' },
          { value: 'worker_buys', label: 'Worker should purchase parts (I will reimburse with receipts)' },
          { value: 'already_bought', label: 'I already have all replacement parts ready' }
        ]
      },
      {
        field_key: 'tools_required_from_worker',
        type: 'yes-no',
        label: 'Worker must bring complete plumbing toolkit',
        required: true,
        order: 6,
        default_value: true
      },
      {
        field_key: 'preferred_visit_slot',
        type: 'dropdown',
        label: 'Preferred Visit Time Slot',
        required: true,
        order: 7,
        default_value: 'morning',
        options: [
          { value: 'morning', label: '🌅 Morning (8:00 AM - 12:00 PM)' },
          { value: 'afternoon', label: '☀️ Afternoon (12:00 PM - 4:00 PM)' },
          { value: 'evening', label: '🌆 Evening (4:00 PM - 8:00 PM)' },
          { value: 'emergency_now', label: '🚨 Immediate Emergency (Within 1-2 Hours)' }
        ]
      },
      {
        field_key: 'additional_plumbing_notes',
        type: 'textarea',
        label: 'Additional Information for Handyman',
        placeholder: 'Mention floor level, lift availability, main line valve position, etc...',
        required: false,
        order: 8
      }
    ],
    conditional_rules: []
  },

  // 5. PHOTOGRAPHY & FIELD WORK → STORE PHOTOGRAPHY (PHYSICAL)
  {
    id: 105,
    title: 'Retail Storefront & Shelf Audit Photography',
    slug: 'retail-storefront-audit-photography',
    category_id: 8,
    category_name: 'Photography & Field Work',
    subcategory: 'Store Photography',
    emoji: '📸',
    task_type: 'physical',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 500,
    suggested_budget_min: 350,
    suggested_budget_max: 2000,
    duration_minutes: 60,
    delivery_hours: 24,
    short_desc: 'Field worker captures high-res store facade, signage, and shelf display photos with GPS metadata.',
    instructions: 'Visit specified retail addresses during business hours. Capture sharp, well-lit photos of storefront banner, shelf displays, and cash counter with GPS verification.',
    deliverables: [
      'Original unedited photos with embedded EXIF GPS coordinates',
      'Completed field checklist verification report'
    ],
    skills: 'field-photography, audit, store-check, gps-verification, mobile-photo',
    tags: 'store photography, retail audit, field work, local photography, photos',
    fields: [
      {
        field_key: 'location_count',
        type: 'number',
        label: 'Number of Outlets / Stores to Visit',
        required: true,
        order: 1,
        default_value: 1,
        min: 1,
        max: 50
      },
      {
        field_key: 'photo_count_per_store',
        type: 'number',
        label: 'Photos Required per Location',
        required: true,
        order: 2,
        default_value: 6,
        min: 1,
        max: 50
      },
      {
        field_key: 'environment_type',
        type: 'dropdown',
        label: 'Photo Environment',
        required: true,
        order: 3,
        default_value: 'both',
        options: [
          { value: 'outdoor_facade', label: 'Outdoor Signage / Facade Only' },
          { value: 'indoor_shelf', label: 'Indoor Shelf / Product Display' },
          { value: 'both', label: 'Both Outdoor Facade & Indoor Shelves' }
        ]
      },
      {
        field_key: 'required_resolution',
        type: 'dropdown',
        label: 'Required Photo Quality',
        required: true,
        order: 4,
        default_value: 'high_res_mobile',
        options: [
          { value: 'high_res_mobile', label: 'High-Res Smartphone Photo (12MP+ Clean)' },
          { value: 'dslr_pro', label: 'DSLR / Mirrorless Professional Camera' }
        ]
      },
      {
        field_key: 'gps_metadata_required',
        type: 'toggle',
        label: 'Require GPS Location in Photo Metadata?',
        description: 'Camera location services must be enabled when taking photos.',
        required: false,
        order: 5,
        default_value: true
      },
      {
        field_key: 'store_visiting_hours',
        type: 'text',
        label: 'Store Opening Hours',
        placeholder: 'e.g. 10:00 AM – 8:00 PM (Sat to Thu)',
        required: true,
        order: 6
      },
      {
        field_key: 'photo_instructions',
        type: 'textarea',
        label: 'Specific Angles Checklist',
        placeholder: '1. Wide front storefront with board\n2. Close up of brand display rack\n3. Competitor price tags...',
        required: true,
        order: 7
      }
    ],
    conditional_rules: []
  },

  // 6. EDUCATION & TUTORING → TUTORING
  {
    id: 106,
    title: 'Academic Tutoring & Exam Preparation Session',
    slug: 'academic-tutoring-lesson',
    category_id: 10,
    category_name: 'Education & Tutoring',
    subcategory: 'Tutoring',
    emoji: '📚',
    task_type: 'both',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 400,
    suggested_budget_min: 250,
    suggested_budget_max: 1500,
    duration_minutes: 60,
    delivery_hours: 24,
    short_desc: 'One-on-one personalized tutoring for school, college, or competitive exam preparation.',
    instructions: 'Conduct structured lesson covering designated syllabus topics. Provide clear explanations, practice exercises, and study notes.',
    deliverables: [
      'Completed tutoring session(s) with student progress summary',
      'Lecture notes / exercise solutions document'
    ],
    skills: 'tutoring, teaching, mathematics, english, physics, ssc, hsc',
    tags: 'tutoring, private tutor, exam prep, academic lesson, study help',
    fields: [
      {
        field_key: 'tutoring_subject',
        type: 'dropdown',
        label: 'Subject',
        required: true,
        order: 1,
        default_value: 'math',
        options: [
          { value: 'math', label: '📐 General & Higher Mathematics' },
          { value: 'physics', label: '⚡ Physics' },
          { value: 'chemistry', label: '🧪 Chemistry' },
          { value: 'biology', label: '🧬 Biology' },
          { value: 'english', label: '🇬🇧 English Language & Grammar' },
          { value: 'ict_coding', label: '💻 ICT & Coding Basics' },
          { value: 'accounting', label: '📊 Accounting & Business Studies' },
          { value: 'ielts_spoken', label: '🗣️ IELTS / Spoken English' },
          { value: 'other', label: '📝 Other Subject' }
        ]
      },
      {
        field_key: 'student_class_level',
        type: 'dropdown',
        label: 'Student Class / Grade Level',
        required: true,
        order: 2,
        default_value: 'secondary_ssc',
        options: [
          { value: 'primary', label: 'Class 1 – 5 (Primary School)' },
          { value: 'junior', label: 'Class 6 – 8 (Junior High)' },
          { value: 'secondary_ssc', label: 'Class 9 – 10 (SSC / O Levels)' },
          { value: 'higher_hsc', label: 'Class 11 – 12 (HSC / A Levels)' },
          { value: 'university', label: 'University / Undergraduate' },
          { value: 'adult_professional', label: 'Adult Learner' }
        ]
      },
      {
        field_key: 'curriculum',
        type: 'dropdown',
        label: 'Curriculum & Board',
        required: true,
        order: 3,
        default_value: 'national_bangla',
        options: [
          { value: 'national_bangla', label: 'National Curriculum (Bangla Medium)' },
          { value: 'national_english', label: 'National Curriculum (English Version)' },
          { value: 'cambridge_edexcel', label: 'English Medium (Cambridge / Edexcel)' },
          { value: 'madrasah', label: 'Madrasah Education Board' },
          { value: 'general_skills', label: 'General / Non-curriculum' }
        ]
      },
      {
        field_key: 'tutoring_mode',
        type: 'radio',
        label: 'Lesson Delivery Mode',
        required: true,
        order: 4,
        default_value: 'online_video',
        options: [
          { value: 'online_video', label: '💻 Online Video Meeting (Zoom / Google Meet)' },
          { value: 'home_tutor', label: '🏠 In-person Home Tutor (Tutor visits student)' }
        ]
      },
      {
        field_key: 'session_duration_minutes',
        type: 'dropdown',
        label: 'Session Duration',
        required: true,
        order: 5,
        default_value: '60',
        options: [
          { value: '45', label: '45 Minutes' },
          { value: '60', label: '1 Hour (Standard)' },
          { value: '90', label: '1.5 Hours' },
          { value: '120', label: '2 Hours' }
        ]
      },
      {
        field_key: 'total_sessions',
        type: 'number',
        label: 'Number of Sessions',
        required: true,
        order: 6,
        default_value: 4,
        min: 1,
        max: 50
      },
      {
        field_key: 'special_goals',
        type: 'textarea',
        label: 'Syllabus Focus / Exam Goals',
        placeholder: 'e.g. Focus on Calculus chapter for upcoming pre-board exam...',
        required: false,
        order: 7
      }
    ],
    conditional_rules: []
  },

  // 7. PROFESSIONAL SERVICES → CONSULTATION
  {
    id: 107,
    title: 'Verified Professional Expert Consultation & Advice',
    slug: 'professional-expert-consultation',
    category_id: 10,
    category_name: 'Expert Help',
    subcategory: 'Professional Services',
    emoji: '🧠',
    task_type: 'both',
    complexity: 'expert',
    complexity_label: '🏆 Expert / Pro',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 650,
    suggested_budget_min: 400,
    suggested_budget_max: 3000,
    duration_minutes: 45,
    delivery_hours: 24,
    short_desc: 'One-on-one expert consultation with verified lawyer, doctor, engineer, or chartered accountant.',
    instructions: 'Review case brief or documents, conduct consultation, and deliver actionable written recommendations with professional advice.',
    deliverables: [
      'Comprehensive 1-on-1 consultation session completed',
      'Written expert advisory summary & recommendation notes'
    ],
    skills: 'legal-advice, medical-opinion, engineering-audit, chartered-accountant, tax-consulting',
    tags: 'professional consultation, expert advice, legal, medical, engineer, tax',
    fields: [
      {
        field_key: 'profession_type',
        type: 'dropdown',
        label: 'Professional Specialization',
        required: true,
        order: 1,
        default_value: 'lawyer',
        options: [
          { value: 'lawyer', label: '⚖️ Advocate / Legal Counsel (Dhaka Bar / Supreme Court)' },
          { value: 'doctor', label: '🩺 Medical Specialist / Physician (MBBS/FCPS)' },
          { value: 'engineer', label: '🏗️ Civil / Structural / Electrical Engineer (IEB)' },
          { value: 'architect', label: '🏛️ Registered Architect (IAB)' },
          { value: 'accountant', label: '📑 Chartered Accountant / Tax Advisor (ICAB/CMA)' },
          { value: 'business_consultant', label: '📈 Corporate Business Consultant' }
        ]
      },
      {
        field_key: 'consultation_duration',
        type: 'dropdown',
        label: 'Consultation Format',
        required: true,
        order: 2,
        default_value: '30_min',
        options: [
          { value: '15_min', label: '⚡ 15-Min Quick Case Review' },
          { value: '30_min', label: '💬 30-Min Standard Consultation' },
          { value: '60_min', label: '🔬 60-Min In-Depth Deep Dive' },
          { value: 'written_only', label: '📄 Written Document / Contract Audit (No Call)' }
        ]
      },
      {
        field_key: 'meeting_channel',
        type: 'radio',
        label: 'Preferred Channel',
        required: true,
        order: 3,
        default_value: 'video_call',
        options: [
          { value: 'video_call', label: '📹 XtraEarn Secure Video Call' },
          { value: 'audio_call', label: '📞 Voice Call' },
          { value: 'secure_chat', label: '💬 Secure Chat & File Exchange' }
        ]
      },
      {
        field_key: 'verification_requirement',
        type: 'dropdown',
        label: 'Professional Verification Requirement',
        required: true,
        order: 4,
        default_value: 'verified_only',
        options: [
          { value: 'verified_only', label: '🔒 Strictly Verified Licensed Professionals Only' },
          { value: 'top_rated', label: '⭐ Top-Rated Experienced Specialists' }
        ]
      },
      {
        field_key: 'document_brief',
        type: 'textarea',
        label: 'Case Brief / Problem Summary',
        placeholder: 'Summarize the core legal dispute, medical symptoms, property deeds, tax query or blueprint review requirements...',
        required: true,
        order: 5
      }
    ],
    conditional_rules: []
  },

  // 8. WRITING & CONTENT → ARTICLE & BLOG
  {
    id: 108,
    title: 'SEO Blog Post & Article Writing',
    slug: 'seo-blog-article-writing',
    category_id: 2,
    category_name: 'Writing & Content',
    subcategory: 'Article & Blog Writing',
    emoji: '✍️',
    task_type: 'online',
    complexity: 'beginner',
    complexity_label: '🌱 Beginner',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 250,
    suggested_budget_min: 150,
    suggested_budget_max: 600,
    duration_minutes: 30,
    delivery_hours: 48,
    short_desc: 'Engaging, human-written, SEO-optimized articles with structured H2/H3 headers.',
    instructions: 'Write 100% original, well-researched article. Incorporate primary and secondary keywords naturally. No AI plagiarism.',
    deliverables: [
      'Formatted Word Document (.docx) / Google Doc',
      'Meta title, meta description, and royalty-free image suggestions'
    ],
    skills: 'seo-writing, blog, content-writing, copywriting, research',
    tags: 'article writing, blog post, seo content, copywriting, content',
    fields: [
      {
        field_key: 'word_count',
        type: 'number',
        label: 'Target Word Count',
        required: true,
        order: 1,
        default_value: 1000,
        min: 300,
        max: 10000
      },
      {
        field_key: 'content_niche',
        type: 'dropdown',
        label: 'Industry / Niche',
        required: true,
        order: 2,
        default_value: 'tech',
        options: [
          { value: 'tech', label: '💻 Tech & Software' },
          { value: 'business', label: '📈 Business & Finance' },
          { value: 'health', label: '🩺 Health & Fitness' },
          { value: 'lifestyle', label: '✈️ Lifestyle, Travel & Food' },
          { value: 'ecommerce', label: '🛒 E-commerce & Product Reviews' },
          { value: 'education', label: '🎓 Education & Career' }
        ]
      },
      {
        field_key: 'target_keywords',
        type: 'text',
        label: 'Primary & Secondary SEO Keywords',
        placeholder: 'e.g. freelance income bangladesh, best earning apps 2026',
        required: false,
        order: 3
      },
      {
        field_key: 'tone_of_voice',
        type: 'dropdown',
        label: 'Tone of Voice',
        required: true,
        order: 4,
        default_value: 'engaging',
        options: [
          { value: 'engaging', label: 'Conversational & Engaging' },
          { value: 'professional', label: 'Professional & Authoritative' },
          { value: 'persuasive', label: 'Persuasive (Sales Copy / Affiliate)' },
          { value: 'academic', label: 'Academic & Formal' }
        ]
      },
      {
        field_key: 'article_topic',
        type: 'textarea',
        label: 'Article Title / Outline Idea',
        placeholder: 'Specify your desired topic, reference links, or key takeaways...',
        required: true,
        order: 5
      }
    ],
    conditional_rules: []
  },

  // 9. VIDEO & ANIMATION → VIDEO EDITING
  {
    id: 109,
    title: 'Short-Form Video Editing (Reels, TikTok, YouTube Shorts)',
    slug: 'short-form-video-editing',
    category_id: 4,
    category_name: 'Video & Animation',
    subcategory: 'Video Editing',
    emoji: '🎬',
    task_type: 'online',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 350,
    suggested_budget_min: 200,
    suggested_budget_max: 900,
    duration_minutes: 45,
    delivery_hours: 24,
    short_desc: 'Fast-paced vertical video editing with dynamic motion captions, sound FX, and zooms.',
    instructions: 'Turn raw talking-head or B-roll footage into a high-retention vertical video with color grading, animated captions, and sound effects.',
    deliverables: [
      'Rendered High-Bitrate MP4 (1080x1920 60fps)',
      'Clean project file / template link'
    ],
    skills: 'video-editing, capcut, premiere-pro, reels, tiktok, motion-graphics',
    tags: 'video editing, reels, tiktok, youtube shorts, video editor',
    fields: [
      {
        field_key: 'raw_footage_duration',
        type: 'dropdown',
        label: 'Raw Footage Length',
        required: true,
        order: 1,
        default_value: 'under_5m',
        options: [
          { value: 'under_5m', label: 'Under 5 Minutes' },
          { value: '5_15m', label: '5 – 15 Minutes' },
          { value: '15_30m', label: '15 – 30 Minutes' },
          { value: 'over_30m', label: 'Over 30 Minutes' }
        ]
      },
      {
        field_key: 'aspect_ratio',
        type: 'dropdown',
        label: 'Target Aspect Ratio',
        required: true,
        order: 2,
        default_value: 'vertical_9_16',
        options: [
          { value: 'vertical_9_16', label: '📱 9:16 Vertical (Reels / TikTok / Shorts)' },
          { value: 'horizontal_16_9', label: '🖥️ 16:9 Horizontal (YouTube / TV)' },
          { value: 'square_1_1', label: '⬛ 1:1 Square (Feed Post)' }
        ]
      },
      {
        field_key: 'caption_style',
        type: 'dropdown',
        label: 'Caption Style',
        required: true,
        order: 3,
        default_value: 'animated_bold',
        options: [
          { value: 'animated_bold', label: '🔥 Animated Colorful Bold Captions (Alex Hormozi style)' },
          { value: 'minimal_clean', label: '✨ Minimal Clean Subtitles' },
          { value: 'none', label: '🚫 No Captions Needed' }
        ]
      },
      {
        field_key: 'b_roll_and_sfx',
        type: 'toggle',
        label: 'Add Relevant B-Roll & Sound Effects (Whooshes, Pops)?',
        required: false,
        order: 4,
        default_value: true
      },
      {
        field_key: 'raw_video_url',
        type: 'url',
        label: 'Raw Footage Cloud Link (Drive / Dropbox)',
        placeholder: 'https://drive.google.com/drive/folders/...',
        required: false,
        order: 5
      }
    ],
    conditional_rules: []
  },

  // 10. TRANSLATION & LANGUAGES → DOCUMENT TRANSLATION
  {
    id: 110,
    title: 'Professional Human Document Translation',
    slug: 'professional-human-translation',
    category_id: 3,
    category_name: 'Translation & Languages',
    subcategory: 'Document Translation',
    emoji: '🌐',
    task_type: 'online',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 200,
    suggested_budget_min: 100,
    suggested_budget_max: 800,
    duration_minutes: 30,
    delivery_hours: 24,
    short_desc: 'Accurate, contextual human translation between Bengali, English, Arabic, and other languages.',
    instructions: 'Translate text preserving native idioms, grammatical flow, and original document formatting. Machine translation output rejected.',
    deliverables: [
      'Clean translated document in original layout (.docx / PDF)',
      'Bilingual comparison side-by-side table'
    ],
    skills: 'translation, bengali, english, proofreading, transcription',
    tags: 'translation, bengali english, document translation, proofreading',
    fields: [
      {
        field_key: 'source_language',
        type: 'dropdown',
        label: 'Source Language',
        required: true,
        order: 1,
        default_value: 'bengali',
        options: [
          { value: 'bengali', label: '🇧🇩 Bengali' },
          { value: 'english', label: '🇬🇧 English' },
          { value: 'arabic', label: '🇸🇦 Arabic' },
          { value: 'hindi', label: '🇮🇳 Hindi' },
          { value: 'urdu', label: '🇵🇰 Urdu' },
          { value: 'other', label: '🌐 Other Language' }
        ]
      },
      {
        field_key: 'target_language',
        type: 'dropdown',
        label: 'Target Language',
        required: true,
        order: 2,
        default_value: 'english',
        options: [
          { value: 'english', label: '🇬🇧 English' },
          { value: 'bengali', label: '🇧🇩 Bengali' },
          { value: 'arabic', label: '🇸🇦 Arabic' },
          { value: 'hindi', label: '🇮🇳 Hindi' },
          { value: 'urdu', label: '🇵🇰 Urdu' },
          { value: 'other', label: '🌐 Other Language' }
        ]
      },
      {
        field_key: 'word_count',
        type: 'number',
        label: 'Approximate Word Count',
        required: true,
        order: 3,
        default_value: 500,
        min: 50,
        max: 50000
      },
      {
        field_key: 'document_type',
        type: 'dropdown',
        label: 'Document Type',
        required: true,
        order: 4,
        default_value: 'general',
        options: [
          { value: 'general', label: 'General Text / Email' },
          { value: 'legal_certificate', label: 'Legal / Birth / Marriage / Academic Certificate' },
          { value: 'business_report', label: 'Business / Financial Report' },
          { value: 'medical', label: 'Medical Report / Prescription' },
          { value: 'technical', label: 'Technical Manual / Website String' }
        ]
      },
      {
        field_key: 'preserve_formatting',
        type: 'toggle',
        label: 'Preserve Exact Visual Formatting (Tables, Headers, Signatures)',
        required: false,
        order: 5,
        default_value: true
      }
    ],
    conditional_rules: []
  },

  // 11. WEBSITE & SOFTWARE → BUG FIXING & WEB DEV
  {
    id: 111,
    title: 'Website Bug Fixing, Speed Optimization & Feature Dev',
    slug: 'web-bug-fixing-feature-dev',
    category_id: 9,
    category_name: 'Website & Software',
    subcategory: 'Bug Fixing',
    emoji: '💻',
    task_type: 'online',
    complexity: 'expert',
    complexity_label: '🏆 Expert / Pro',
    version: 1,
    status: 'active',
    is_featured: 1,
    default_budget: 500,
    suggested_budget_min: 300,
    suggested_budget_max: 2500,
    duration_minutes: 60,
    delivery_hours: 48,
    short_desc: 'Fix CSS/JS errors, WordPress plugin conflicts, database bugs, or API integrations.',
    instructions: 'Isolate root cause, apply fix in clean staging environment, verify responsive cross-browser compatibility, and deploy cleanly.',
    deliverables: [
      'Resolved issue verified on live / staging server',
      'Brief technical changelog explaining what was fixed'
    ],
    skills: 'wordpress, javascript, php, css, nodejs, bug-fixing, web-development',
    tags: 'web development, bug fix, wordpress, javascript, php, coding',
    fields: [
      {
        field_key: 'tech_stack',
        type: 'dropdown',
        label: 'Technology Stack / CMS',
        required: true,
        order: 1,
        default_value: 'wordpress',
        options: [
          { value: 'wordpress', label: 'WordPress / WooCommerce / Elementor' },
          { value: 'nodejs_express', label: 'Node.js / Express' },
          { value: 'react_next', label: 'React / Next.js / Vue' },
          { value: 'php_laravel', label: 'PHP / Laravel' },
          { value: 'python_django', label: 'Python / Django / FastAPI' },
          { value: 'html_css_js', label: 'HTML5 / CSS3 / Vanilla JS' },
          { value: 'shopify', label: 'Shopify Liquid' },
          { value: 'other', label: 'Other Framework' }
        ]
      },
      {
        field_key: 'issue_category',
        type: 'dropdown',
        label: 'Issue Category',
        required: true,
        order: 2,
        default_value: 'bug_fix',
        options: [
          { value: 'bug_fix', label: '🐛 Bug / Error / Broken Feature' },
          { value: 'responsive_layout', label: '📱 Mobile Responsive UI Glitch' },
          { value: 'speed_perf', label: '⚡ Speed & Core Web Vitals Optimization' },
          { value: 'payment_api', label: '💳 Payment Gateway / API Integration' },
          { value: 'security_malware', label: '🛡️ Malware Cleanup & SSL Fix' },
          { value: 'new_feature', label: '✨ New Custom Feature / Component' }
        ]
      },
      {
        field_key: 'access_method',
        type: 'radio',
        label: 'How will you share code / access?',
        required: true,
        order: 3,
        default_value: 'wp_admin',
        options: [
          { value: 'wp_admin', label: 'Temporary WordPress Admin / cPanel Credentials' },
          { value: 'git_repo', label: 'GitHub / GitLab Repository Invitation' },
          { value: 'zip_code', label: 'ZIP file containing source code' },
          { value: 'screen_share', label: 'Live Screen Share / AnyDesk' }
        ]
      },
      {
        field_key: 'error_description',
        type: 'textarea',
        label: 'Bug Description & Steps to Reproduce',
        placeholder: 'What happens vs what should happen? Paste any error logs or console messages...',
        required: true,
        order: 4
      },
      {
        field_key: 'website_url',
        type: 'url',
        label: 'Website URL',
        placeholder: 'https://mywebsite.com',
        required: false,
        order: 5
      }
    ],
    conditional_rules: []
  },

  // 12. GENERAL TASK BLUEPRINT → UNIVERSAL FALLBACK
  {
    id: 112,
    title: 'Universal Custom Task Blueprint',
    slug: 'universal-custom-task',
    category_id: 13,
    category_name: 'Business & Virtual Assistance',
    subcategory: 'General',
    emoji: '📝',
    task_type: 'both',
    complexity: 'intermediate',
    complexity_label: '⚡ Intermediate',
    version: 1,
    status: 'active',
    is_featured: 0,
    default_budget: 200,
    suggested_budget_min: 100,
    suggested_budget_max: 1000,
    duration_minutes: 30,
    delivery_hours: 24,
    short_desc: 'Flexible turn-key blueprint for custom digital or field assistance tasks.',
    instructions: 'Complete all steps as outlined in the client brief with timely communication and standard quality deliverables.',
    deliverables: [
      'Completed task deliverable meeting agreed client specifications'
    ],
    skills: 'virtual-assistant, data-entry, research, communication',
    tags: 'general task, assistance, custom job',
    fields: [
      {
        field_key: 'specific_objective',
        type: 'textarea',
        label: 'Primary Task Objective',
        placeholder: 'Describe the main goal you want the worker to accomplish...',
        required: true,
        order: 1
      },
      {
        field_key: 'deliverable_format',
        type: 'text',
        label: 'Expected Deliverable Format',
        placeholder: 'e.g. Google Sheet link, ZIP file of photos, PDF summary report',
        required: false,
        order: 2
      },
      {
        field_key: 'special_instructions',
        type: 'textarea',
        label: 'Special Constraints / Guidelines',
        placeholder: 'Mention any deadlines, software requirements, or reference links...',
        required: false,
        order: 3
      }
    ],
    conditional_rules: []
  }
];

module.exports = {
  TEMPLATE_SEEDS
};
