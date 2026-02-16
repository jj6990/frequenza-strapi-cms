import type { Schema, Struct } from '@strapi/strapi';

export interface EventPriceTier extends Struct.ComponentSchema {
  collectionName: 'components_event_price_tiers';
  info: {
    description: 'Precio por entrada a partir de una cantidad m\u00EDnima';
    displayName: 'Price Tier';
    icon: 'dollar-sign';
  };
  attributes: {
    minQuantity: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    pricePerTicket: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'event.price-tier': EventPriceTier;
      'shared.seo': SharedSeo;
    }
  }
}
