import { Injectable, NgZone } from '@angular/core';
import { LocationDetails } from '../models/location.model';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private geocoder: any;

  constructor(private ngZone: NgZone) {
    this.geocoder = new google.maps.Geocoder();
  }

  reverseGeocode(lat: number, lng: number): Promise<LocationDetails> {
    return new Promise((resolve, reject) => {
      const latlng = { lat, lng };
      this.geocoder.geocode({ location: latlng }, (results: any[], status: string) => {
        this.ngZone.run(() => {
          if (status === 'OK' && results[0]) {
            resolve(this.parseGeocodingResult(results[0], lat, lng));
          } else {
            reject(`Geocoding failed: ${status}`);
          }
        });
      });
    });
  }

  geocodeAddress(address: string): Promise<LocationDetails> {
    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address }, (results: any[], status: string) => {
        this.ngZone.run(() => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            resolve(this.parseGeocodingResult(results[0], location.lat(), location.lng()));
          } else {
            reject(`Geocoding failed: ${status}`);
          }
        });
      });
    });
  }

  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by this browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  }

  private parseGeocodingResult(result: any, lat: number, lng: number): LocationDetails {
    const components = result.address_components;
    return {
      fullAddress: result.formatted_address,
      streetNumber: this.getComponent(components, 'street_number'),
      streetName: this.getComponent(components, 'route'),
      areaName: this.getComponent(components, 'sublocality_level_1')
        || this.getComponent(components, 'sublocality')
        || this.getComponent(components, 'neighborhood'),
      city: this.getComponent(components, 'locality')
        || this.getComponent(components, 'administrative_area_level_2'),
      district: this.getComponent(components, 'administrative_area_level_2'),
      state: this.getComponent(components, 'administrative_area_level_1'),
      country: this.getComponent(components, 'country'),
      postalCode: this.getComponent(components, 'postal_code'),
      latitude: lat,
      longitude: lng,
      placeId: result.place_id,
      formattedAddress: result.formatted_address
    };
  }

  private getComponent(components: any[], type: string): string {
    const component = components.find((c: any) => c.types.includes(type));
    return component ? component.long_name : '';
  }
}
