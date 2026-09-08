/**
 * XtraEarn International Geographic & Country Data Module
 * Provides global country registries, phone dial codes, and district/state mappings
 * Supports Bangladesh (all 64 districts by division), USA, UK, Canada, Australia, UAE, KSA, India, etc.
 */
(function(root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (typeof root !== 'undefined') {
    root.XECurrencyAndGeo = mod;
  }
  if (typeof window !== 'undefined') {
    window.XECurrencyAndGeo = mod;
  }
}(typeof self !== 'undefined' ? self : this, function() {

  const COUNTRIES = [
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dial: '+880', currency: 'BDT', symbol: '৳' },
    { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1', currency: 'USD', symbol: '$' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44', currency: 'GBP', symbol: '£' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1', currency: 'CAD', symbol: 'CA$' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971', currency: 'AED', symbol: 'AED' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial: '+966', currency: 'SAR', symbol: 'SAR' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61', currency: 'AUD', symbol: 'A$' },
    { code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91', currency: 'INR', symbol: '₹' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', dial: '+65', currency: 'SGD', symbol: 'S$' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dial: '+60', currency: 'MYR', symbol: 'RM' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49', currency: 'EUR', symbol: '€' },
    { code: 'OTHER', name: 'International / Other', flag: '🌐', dial: '+1', currency: 'USD', symbol: '$' }
  ];

  // Bangladesh 64 Districts organized by Division
  const BD_DIVISIONS = {
    'Dhaka Division': [
      'Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Kishoreganj',
      'Manikganj', 'Munshiganj', 'Narsingdi', 'Faridpur', 'Gopalganj',
      'Madaripur', 'Rajbari', 'Shariatpur'
    ],
    'Chattogram Division': [
      'Chattogram', 'Cox\'s Bazar', 'Cumilla', 'Feni', 'Brahmanbaria',
      'Noakhali', 'Chandpur', 'Lakshmipur', 'Rangamati', 'Khagrachhari', 'Bandarban'
    ],
    'Sylhet Division': [
      'Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'
    ],
    'Rajshahi Division': [
      'Rajshahi', 'Bogura', 'Pabna', 'Sirajganj', 'Naogaon',
      'Natore', 'Chapainawabganj', 'Joypurhat'
    ],
    'Khulna Division': [
      'Khulna', 'Jashore', 'Kushtia', 'Satkhira', 'Bagerhat',
      'Jhenaidah', 'Chuadanga', 'Magura', 'Meherpur', 'Narail'
    ],
    'Barishal Division': [
      'Barishal', 'Bhola', 'Patuakhali', 'Pirojpur', 'Barguna', 'Jhalokathi'
    ],
    'Rangpur Division': [
      'Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat',
      'Nilphamari', 'Panchagarh', 'Thakurgaon'
    ],
    'Mymensingh Division': [
      'Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur'
    ]
  };

  const COUNTRY_REGIONS = {
    'BD': {
      label: 'District',
      isGrouped: true,
      groups: BD_DIVISIONS
    },
    'US': {
      label: 'State',
      isGrouped: false,
      items: [
        'California', 'New York', 'Texas', 'Florida', 'Washington', 'Illinois',
        'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'New Jersey',
        'Virginia', 'Massachusetts', 'Colorado', 'Arizona', 'Tennessee', 'Maryland',
        'Minnesota', 'Indiana', 'Missouri', 'Wisconsin', 'Oregon', 'Connecticut'
      ]
    },
    'GB': {
      label: 'Region / City',
      isGrouped: false,
      items: [
        'Greater London', 'Greater Manchester', 'West Midlands (Birmingham)',
        'West Yorkshire (Leeds)', 'Scotland (Edinburgh / Glasgow)', 'Wales (Cardiff)',
        'Northern Ireland (Belfast)', 'Bristol', 'Liverpool', 'Newcastle', 'Sheffield'
      ]
    },
    'CA': {
      label: 'Province',
      isGrouped: false,
      items: [
        'Ontario (Toronto)', 'British Columbia (Vancouver)', 'Quebec (Montreal)',
        'Alberta (Calgary / Edmonton)', 'Manitoba (Winnipeg)', 'Nova Scotia', 'Saskatchewan'
      ]
    },
    'AE': {
      label: 'Emirate',
      isGrouped: false,
      items: [
        'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
      ]
    },
    'SA': {
      label: 'Province / City',
      isGrouped: false,
      items: [
        'Riyadh Province (Riyadh)', 'Makkah Province (Jeddah / Makkah)',
        'Eastern Province (Dammam / Khobar)', 'Madinah Province', 'Asir (Abha)', 'Tabuk'
      ]
    },
    'AU': {
      label: 'State',
      isGrouped: false,
      items: [
        'New South Wales (Sydney)', 'Victoria (Melbourne)', 'Queensland (Brisbane)',
        'Western Australia (Perth)', 'South Australia (Adelaide)', 'Tasmania', 'Australian Capital Territory'
      ]
    },
    'IN': {
      label: 'State / Territory',
      isGrouped: false,
      items: [
        'Delhi NCR', 'Maharashtra (Mumbai / Pune)', 'Karnataka (Bengaluru)',
        'West Bengal (Kolkata)', 'Tamil Nadu (Chennai)', 'Telangana (Hyderabad)',
        'Gujarat (Ahmedabad)', 'Uttar Pradesh', 'Kerala', 'Punjab', 'Rajasthan'
      ]
    },
    'SG': {
      label: 'Region',
      isGrouped: false,
      items: [
        'Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'
      ]
    },
    'MY': {
      label: 'State / Territory',
      isGrouped: false,
      items: [
        'Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Sabah', 'Sarawak', 'Perak', 'Melaka'
      ]
    },
    'DE': {
      label: 'State (Bundesland)',
      isGrouped: false,
      items: [
        'Berlin', 'Bavaria (Munich)', 'North Rhine-Westphalia (Cologne / Düsseldorf)',
        'Hamburg', 'Hesse (Frankfurt)', 'Baden-Württemberg (Stuttgart)', 'Saxony'
      ]
    },
    'OTHER': {
      label: 'City / Province',
      isGrouped: false,
      items: [
        'Capital City', 'Major Metropolitan Area', 'Northern Region', 'Southern Region', 'Other Location'
      ]
    }
  };

  function getCountry(codeOrName) {
    if (!codeOrName) return COUNTRIES[0];
    const clean = String(codeOrName).trim().toLowerCase();
    return COUNTRIES.find(c => c.code.toLowerCase() === clean || c.name.toLowerCase() === clean) || COUNTRIES[0];
  }

  function populateCountrySelect(selectEl, selectedValue = 'BD') {
    if (!selectEl) return;
    const current = getCountry(selectedValue);
    selectEl.innerHTML = COUNTRIES.map(c => `
      <option value="${c.code}" ${c.code === current.code ? 'selected' : ''}>
        ${c.flag} ${c.name} (${c.dial})
      </option>
    `).join('');
  }

  function populateDistrictSelect(selectEl, countryCodeOrName = 'BD', selectedDistrict = '') {
    if (!selectEl) return;
    const country = getCountry(countryCodeOrName);
    const regData = COUNTRY_REGIONS[country.code] || COUNTRY_REGIONS['OTHER'];
    const cleanSelected = String(selectedDistrict || '').trim().toLowerCase();
    let hasMatched = false;

    let html = `<option value="">Select ${regData.label}...</option>`;

    if (regData.isGrouped && regData.groups) {
      for (const [groupName, dists] of Object.entries(regData.groups)) {
        html += `<optgroup label="${groupName}">`;
        for (const d of dists) {
          const isSel = cleanSelected && (cleanSelected === d.toLowerCase() || cleanSelected.includes(d.toLowerCase()));
          if (isSel) hasMatched = true;
          html += `<option value="${d}" ${isSel ? 'selected' : ''}>${d}</option>`;
        }
        html += `</optgroup>`;
      }
    } else if (regData.items) {
      for (const item of regData.items) {
        const isSel = cleanSelected && (cleanSelected === item.toLowerCase() || cleanSelected.includes(item.toLowerCase()));
        if (isSel) hasMatched = true;
        html += `<option value="${item}" ${isSel ? 'selected' : ''}>${item}</option>`;
      }
    }

    const selectCustom = cleanSelected && (!hasMatched || cleanSelected === '__custom__' || cleanSelected === 'other');
    html += `<option value="__CUSTOM__" ${selectCustom ? 'selected' : ''}>✍️ Other / Custom Location...</option>`;
    selectEl.innerHTML = html;
  }

  function parseLocation(locStr) {
    if (!locStr) return { country: 'Bangladesh', countryCode: 'BD', district: 'Dhaka' };
    const str = String(locStr).trim();
    const parts = str.split(',').map(s => s.trim());

    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const first = parts[0];
      const matchedC = COUNTRIES.find(c => c.name.toLowerCase() === last.toLowerCase() || c.code.toLowerCase() === last.toLowerCase());
      if (matchedC) {
        return {
          country: matchedC.name,
          countryCode: matchedC.code,
          district: first
        };
      }
    }

    // Check if whole string matches a country
    const directCountry = COUNTRIES.find(c => c.name.toLowerCase() === str.toLowerCase() || c.code.toLowerCase() === str.toLowerCase());
    if (directCountry) {
      return { country: directCountry.name, countryCode: directCountry.code, district: '' };
    }

    // Check if matches a BD district
    for (const dists of Object.values(BD_DIVISIONS)) {
      const found = dists.find(d => str.toLowerCase().includes(d.toLowerCase()));
      if (found) {
        return { country: 'Bangladesh', countryCode: 'BD', district: found };
      }
    }

    return { country: 'Bangladesh', countryCode: 'BD', district: str };
  }

  function formatLocation(district, countryNameOrCode) {
    const country = getCountry(countryNameOrCode);
    const dClean = String(district || '').trim();
    if (!dClean || dClean === 'Other') return country.name;
    return `${dClean}, ${country.name}`;
  }

  return {
    COUNTRIES,
    SUPPORTED_COUNTRIES: COUNTRIES,
    BD_DIVISIONS,
    BANGLADESH_DISTRICTS_BY_DIVISION: BD_DIVISIONS,
    COUNTRY_REGIONS,
    getCountry,
    getCountryByCode: getCountry,
    populateCountrySelect,
    populateDistrictSelect,
    parseLocation,
    formatLocation
  };
}));
