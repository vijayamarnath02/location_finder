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
          if (status === 'OK' && results.length > 0) {
            // Pick the most detailed result (street_address or premise first)
            const best = results.find((r: any) =>
              r.types.includes('street_address') ||
              r.types.includes('premise') ||
              r.types.includes('subpremise')
            ) || results.find((r: any) =>
              r.types.includes('route') ||
              r.types.includes('establishment')
            ) || results[0];

            resolve(this.parseGeocodingResult(best, results, lat, lng));
          } else {
            reject(`Geocoding failed: ${status}`);
          }
        });
      });
    });
  }

  getAccuratePosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by this browser.');
        return;
      }

      let bestPosition: GeolocationPosition | null = null;
      let resolved = false;

      const done = (pos: GeolocationPosition) => {
        if (resolved) return;
        resolved = true;
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timer);
        resolve(pos);
      };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const acc = position.coords.accuracy;

          if (!bestPosition || acc < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          // Good enough — resolve now
          if (acc <= 100) {
            done(position);
          }
        },
        (error) => {
          if (resolved) return;
          resolved = true;
          navigator.geolocation.clearWatch(watchId);
          clearTimeout(timer);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );

      // After 5 seconds, use whatever we have
      const timer = setTimeout(() => {
        if (bestPosition) {
          done(bestPosition);
        }
      }, 5000);
    });
  }

  private parseGeocodingResult(bestResult: any, allResults: any[], lat: number, lng: number): LocationDetails {
    const components = bestResult.address_components;

    // Try to find area from multiple results if primary doesn't have it
    let areaName = this.getComponent(components, 'sublocality_level_1')
      || this.getComponent(components, 'sublocality')
      || this.getComponent(components, 'neighborhood')
      || this.getComponent(components, 'sublocality_level_2');

    if (!areaName) {
      for (const result of allResults) {
        areaName = this.getComponent(result.address_components, 'sublocality_level_1')
          || this.getComponent(result.address_components, 'sublocality')
          || this.getComponent(result.address_components, 'neighborhood');
        if (areaName) break;
      }
    }

    let city = this.getComponent(components, 'locality')
      || this.getComponent(components, 'administrative_area_level_2');

    if (!city) {
      for (const result of allResults) {
        city = this.getComponent(result.address_components, 'locality');
        if (city) break;
      }
    }

    return {
      fullAddress: bestResult.formatted_address,
      streetNumber: this.getComponent(components, 'street_number'),
      streetName: this.getComponent(components, 'route'),
      areaName,
      city,
      district: this.getComponent(components, 'administrative_area_level_2'),
      state: this.getComponent(components, 'administrative_area_level_1'),
      country: this.getComponent(components, 'country'),
      postalCode: this.getComponent(components, 'postal_code'),
      latitude: lat,
      longitude: lng,
      placeId: bestResult.place_id,
      formattedAddress: bestResult.formatted_address
    };
  }

  private getComponent(components: any[], type: string): string {
    const component = components.find((c: any) => c.types.includes(type));
    return component ? component.long_name : '';
  }
}
