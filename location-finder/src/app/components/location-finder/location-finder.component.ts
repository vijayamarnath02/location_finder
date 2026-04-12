import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeocodingService } from '../../services/geocoding.service';
import { LocationDetails } from '../../models/location.model';

declare var google: any;

@Component({
  selector: 'app-location-finder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-finder.component.html',
  styleUrl: './location-finder.component.scss'
})
export class LocationFinderComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  map: any;
  marker: any;
  accuracyCircle: any;
  locationDetails: LocationDetails | null = null;
  isLoading = false;
  errorMessage = '';
  locationDenied = false;
  mapInitialized = false;
  accuracy: number = 0;

  constructor(
    private geocodingService: GeocodingService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.detectMyLocation();
  }

  private initMap(lat: number, lng: number): void {
    if (this.mapInitialized) return;

    // Wait for the map container to be available in the DOM
    setTimeout(() => {
      if (!this.mapContainer) return;

      this.map = new google.maps.Map(this.mapContainer.nativeElement, {
        center: { lat, lng },
        zoom: 18,
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
        position: { lat, lng },
        draggable: false,
        animation: google.maps.Animation.DROP,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(40, 40)
        }
      });

      // Blue accuracy circle around the marker
      this.accuracyCircle = new google.maps.Circle({
        map: this.map,
        center: { lat, lng },
        radius: this.accuracy || 30,
        fillColor: '#4285F4',
        fillOpacity: 0.15,
        strokeColor: '#4285F4',
        strokeOpacity: 0.4,
        strokeWeight: 1
      });

      this.mapInitialized = true;
    });
  }

  private updateMap(lat: number, lng: number): void {
    if (!this.mapInitialized) {
      this.initMap(lat, lng);
      return;
    }
    const position = new google.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.map.setZoom(19);
    this.marker.setPosition(position);
    this.marker.setAnimation(google.maps.Animation.DROP);
    if (this.accuracyCircle) {
      this.accuracyCircle.setCenter(position);
      this.accuracyCircle.setRadius(this.accuracy || 30);
    }
  }

  async detectMyLocation(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.locationDenied = false;

    try {
      const position = await this.geocodingService.getAccuratePosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      this.accuracy = Math.round(position.coords.accuracy);

      const details = await this.geocodingService.reverseGeocode(lat, lng);
      this.locationDetails = details;
      this.isLoading = false;

      // Init or update map after details are set so the container is in the DOM
      setTimeout(() => this.updateMap(lat, lng));
    } catch (error: any) {
      this.isLoading = false;
      if (error.code && (error.code === 1 || error.code === 2)) {
        this.locationDenied = true;
      } else {
        this.errorMessage = this.getGeolocationErrorMessage(error);
      }
    }
  }

  private getGeolocationErrorMessage(error: any): string {
    if (error.code) {
      switch (error.code) {
        case 3:
          return 'Location request timed out. Please try again.';
        default:
          return 'An unknown error occurred while detecting your location.';
      }
    }
    return typeof error === 'string' ? error : 'Failed to detect location.';
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
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
