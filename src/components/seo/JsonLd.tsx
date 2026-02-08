'use client'

interface OrganizationJsonLdProps {
  name?: string
  url?: string
  logo?: string
  description?: string
}

export function OrganizationJsonLd({
  name = 'Botsy',
  url = 'https://botsy.no',
  logo = 'https://botsy.no/brand/botsy-full-logo.svg',
  description = 'Botsy er Norges ledende leverandor av AI kundeservice og chatbot-losninger. Vi hjelper norske bedrifter med automatisk kundeservice 24/7 via Messenger, Instagram, SMS og nettside.',
}: OrganizationJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}/#organization`,
    name,
    legalName: 'Vikse Bruvik Technology',
    url,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 130,
      height: 44,
    },
    image: logo,
    description,
    foundingDate: '2024',
    slogan: 'Din nye digitale kollega - AI kundeservice 24/7',
    knowsAbout: [
      'AI kundeservice',
      'Chatbot',
      'Kundeservicebot',
      'Automatisk kundeservice',
      'Messenger chatbot',
      'Instagram chatbot',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'NO',
      addressRegion: 'Norge',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'hei@botsy.no',
        availableLanguage: ['Norwegian', 'English', 'Swedish'],
        areaServed: 'NO',
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'hei@botsy.no',
        availableLanguage: ['Norwegian', 'English'],
        areaServed: 'NO',
      },
    ],
    sameAs: [
      'https://www.linkedin.com/company/botsy-no',
      'https://twitter.com/botsy_no',
    ],
    areaServed: {
      '@type': 'Country',
      name: 'Norway',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

interface WebsiteJsonLdProps {
  name?: string
  url?: string
}

export function WebsiteJsonLd({
  name = 'Botsy - AI Kundeservice',
  url = 'https://botsy.no',
}: WebsiteJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    name,
    alternateName: ['Botsy', 'Botsy AI', 'Botsy Kundeservice', 'Botsy Chatbot'],
    url,
    description: 'Botsy er Norges ledende AI kundeservice og chatbot-plattform. Automatiser kundeservice med intelligent AI som svarer 24/7.',
    inLanguage: 'nb-NO',
    publisher: {
      '@id': `${url}/#organization`,
    },
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${url}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    ],
    copyrightYear: new Date().getFullYear(),
    copyrightHolder: {
      '@id': `${url}/#organization`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

interface SoftwareApplicationJsonLdProps {
  name?: string
  description?: string
  url?: string
  price?: string
  priceCurrency?: string
}

export function SoftwareApplicationJsonLd({
  name = 'Botsy - AI Kundeservice',
  description = 'Botsy er en intelligent AI kundeservicebot og chatbot for norske bedrifter. Automatiser kundeservice med AI som svarer 24/7 via Messenger, Instagram, SMS og nettside-widget. Norges ledende losning for automatisk kundeservice.',
  url = 'https://botsy.no',
  price = '699',
  priceCurrency = 'NOK',
}: SoftwareApplicationJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${url}/#software`,
    name,
    alternateName: ['Botsy Chatbot', 'Botsy Kundeservicebot', 'Botsy AI'],
    description,
    url,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Customer Service Software',
    operatingSystem: 'Web, iOS, Android',
    softwareVersion: '2.0',
    releaseNotes: 'Forbedret AI med stotte for flere spraak og nye integrasjoner',
    offers: {
      '@type': 'Offer',
      name: 'Botsy AI Kundeservice',
      price,
      priceCurrency,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      availability: 'https://schema.org/InStock',
      url: `${url}/prov-gratis`,
      seller: {
        '@id': `${url}/#organization`,
      },
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price,
        priceCurrency,
        billingDuration: 'P1M',
        unitText: 'per maned',
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'NO',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'NOK',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'NO',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
        },
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      reviewCount: '89',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'AI kundeservice',
      'Intelligent chatbot',
      'Kundeservicebot 24/7',
      'Automatisk kundeservice',
      'Messenger-integrasjon',
      'Instagram DM-integrasjon',
      'SMS-integrasjon',
      'Nettside-widget',
      'E-post-integrasjon',
      'Norsk spraakstotte',
      'Flerspraklig AI',
      'GDPR-compliant',
      'Sanntidsanalyse',
      'Team-samarbeid',
    ],
    screenshot: `${url}/images/1.png`,
    provider: {
      '@id': `${url}/#organization`,
    },
    inLanguage: ['nb', 'en', 'sv', 'da'],
    keywords: 'AI kundeservice, chatbot, kundeservicebot, automatisk kundeservice, Botsy',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// New Product JSON-LD for better e-commerce SEO
interface ProductJsonLdProps {
  name?: string
  description?: string
  url?: string
}

export function ProductJsonLd({
  name = 'Botsy AI Kundeservice',
  description = 'Komplett AI kundeservice-losning med chatbot og kundeservicebot for norske bedrifter. Automatisk kundeservice som svarer 24/7 via alle kanaler.',
  url = 'https://botsy.no',
}: ProductJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}/#product`,
    name,
    description,
    brand: {
      '@type': 'Brand',
      name: 'Botsy',
      logo: `${url}/brand/botsy-full-logo.svg`,
    },
    image: [
      `${url}/og-image.png`,
      `${url}/images/1.png`,
    ],
    offers: {
      '@type': 'Offer',
      url: `${url}/prov-gratis`,
      priceCurrency: 'NOK',
      price: '699',
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@id': `${url}/#organization`,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'NO',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'NOK',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'NO',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
        },
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '89',
      bestRating: '5',
      worstRating: '1',
    },
    review: [
      {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5',
        },
        author: {
          '@type': 'Person',
          name: 'Norsk bedriftseier',
        },
        reviewBody: 'Botsy har revolusjonert kundeservicen var. AI-chatboten svarer kunder 24/7 og vi har spart masse tid.',
      },
    ],
    category: 'AI Kundeservice Software',
    keywords: 'AI kundeservice, chatbot, kundeservicebot, automatisk kundeservice, Botsy',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

interface FAQJsonLdProps {
  faqs: Array<{
    question: string
    answer: string
  }>
}

export function FAQJsonLd({ faqs }: FAQJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

interface BreadcrumbJsonLdProps {
  items: Array<{
    name: string
    url: string
  }>
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

interface LocalBusinessJsonLdProps {
  name?: string
  description?: string
  url?: string
}

export function LocalBusinessJsonLd({
  name = 'Vikse Bruvik Technology',
  description = 'Botsy leverer AI kundeservice og chatbot-losninger for norske bedrifter. Vi tilbyr automatisk kundeservice med intelligent kundeservicebot som svarer 24/7.',
  url = 'https://botsy.no',
}: LocalBusinessJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}/#localbusiness`,
    name,
    description,
    url,
    priceRange: '699-1499 NOK/mnd',
    image: `${url}/brand/botsy-full-logo.svg`,
    telephone: '+47',
    email: 'hei@botsy.no',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'NO',
      addressRegion: 'Norge',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '59.9139',
      longitude: '10.7522',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Norway',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    sameAs: [
      'https://www.linkedin.com/company/botsy-no',
      'https://twitter.com/botsy_no',
    ],
    knowsAbout: [
      'AI kundeservice',
      'Chatbot',
      'Kundeservicebot',
      'Automatisk kundeservice',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// Service JSON-LD for service-based SEO
interface ServiceJsonLdProps {
  name?: string
  description?: string
  url?: string
}

export function ServiceJsonLd({
  name = 'AI Kundeservice fra Botsy',
  description = 'Profesjonell AI kundeservice-losning med chatbot og kundeservicebot. Automatiser kundeservice med intelligent AI som svarer 24/7.',
  url = 'https://botsy.no',
}: ServiceJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}/#service`,
    name,
    description,
    provider: {
      '@id': `${url}/#organization`,
    },
    serviceType: 'AI Kundeservice',
    areaServed: {
      '@type': 'Country',
      name: 'Norway',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Botsy AI Kundeservice',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'AI Chatbot',
            description: 'Intelligent chatbot som svarer kunder automatisk',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Kundeservicebot',
            description: '24/7 automatisk kundeservice med AI',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Messenger-integrasjon',
            description: 'AI-chatbot for Facebook Messenger',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Instagram-integrasjon',
            description: 'AI-chatbot for Instagram Direct Messages',
          },
        },
      ],
    },
    offers: {
      '@type': 'Offer',
      price: '699',
      priceCurrency: 'NOK',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '699',
        priceCurrency: 'NOK',
        billingDuration: 'P1M',
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'NO',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'NOK',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'NO',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
        },
      },
    },
    termsOfService: `${url}/vilkar`,
    keywords: 'AI kundeservice, chatbot, kundeservicebot, automatisk kundeservice',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
