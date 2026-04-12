import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeocodingService } from '../../services/geocoding.service';
import { LocationDetails } from '../../models/location.model';

declare var google: any;

@Component({
  selector: 'app-location-finder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-finder.component.html',
  styleUrl: './location-finder.component.scss'
})
export class LocationFinderComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef;

  map: any;
  marker: any;
  searchQuery = '';
  locationDetails: LocationDetails | null = null;
  isLoading = false;
  errorMessage = '';
  mapReady = false;

  constructor(
    private geocodingService: GeocodingService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
    this.initAutocomplete();
  }

  private initMap(): void {
    const defaultLocation = { lat: 20.5937, lng: 78.9629 }; // India center

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: defaultLocation,
      zoom: 5,
      styles: this.getMapStyles(),
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: google.maps.ControlPosition.TOP_RIGHT
      },
      fullscreenControl: true,
      streetViewControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER
      }
    });

    this.marker = new google.maps.Marker({
      map: this.map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(40, 40)
      }
    });

    this.marker.addListener('dragend', () => {
      const position = this.marker.getPosition();
      this.getLocationFromCoords(position.lat(), position.lng());
    });

    this.map.addListener('click', (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.placeMarker(lat, lng);
      this.getLocationFromCoords(lat, lng);
    });

    this.mapReady = true;
  }

  private initAutocomplete(): void {
    const autocomplete = new google.maps.places.Autocomplete(
      this.searchInput.nativeElement,
      { types: [] }
    );

    autocomplete.bindTo('bounds', this.map);

    autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          this.errorMessage = 'Place not found. Please try again.';
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        this.map.setCenter(place.geometry.location);
        this.map.setZoom(17);
        this.placeMarker(lat, lng);
        this.getLocationFromCoords(lat, lng);
      });
    });
  }

  async detectMyLocation(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const position = await this.geocodingService.getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      this.map.setCenter({ lat, lng });
      this.map.setZoom(18);
      this.placeMarker(lat, lng);
      await this.getLocationFromCoords(lat, lng);
    } catch (error: any) {
      this.errorMessage = this.getGeolocationErrorMessage(error);
      this.isLoading = false;
    }
  }

  async searchLocation(): Promise<void> {
    if (!this.searchQuery.trim()) {
      this.errorMessage = 'Please enter an address to search.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const details = await this.geocodingService.geocodeAddress(this.searchQuery);
      this.locationDetails = details;
      this.map.setCenter({ lat: details.latitude, lng: details.longitude });
      this.map.setZoom(17);
      this.placeMarker(details.latitude, details.longitude);
      this.isLoading = false;
    } catch (error: any) {
      this.errorMessage = 'Could not find the location. Please try a different address.';
      this.isLoading = false;
    }
  }

  private async getLocationFromCoords(lat: number, lng: number): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const details = await this.geocodingService.reverseGeocode(lat, lng);
      this.locationDetails = details;
      this.isLoading = false;
    } catch (error: any) {
      this.errorMessage = 'Could not retrieve location details.';
      this.isLoading = false;
    }
  }

  private placeMarker(lat: number, lng: number): void {
    const position = new google.maps.LatLng(lat, lng);
    this.marker.setPosition(position);
    this.marker.setVisible(true);
    this.marker.setAnimation(google.maps.Animation.DROP);
  }

  private getGeolocationErrorMessage(error: any): string {
    if (error.code) {
      switch (error.code) {
        case 1:
          return 'Location access denied. Please enable location permissions in your browser settings.';
        case 2:
          return 'Location unavailable. Please check your internet connection.';
        case 3:
          return 'Location request timed out. Please try again.';
        default:
          return 'An unknown error occurred while detecting your location.';
      }
    }
    return typeof error === 'string' ? error : 'Failed to detect location.';
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // brief visual feedback could be added here
    });
  }

  private getMapStyles(): any[] {
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'simplified' }]
      }
    ];
  }
}
