import { Component } from '@angular/core';
import { LocationFinderComponent } from './components/location-finder/location-finder.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LocationFinderComponent],
  template: `<app-location-finder />`,
  styles: []
})
export class AppComponent {}
