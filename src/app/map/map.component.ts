import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  restaurants: any[] = [];
  map: any;
  count = 0;
  latitude : any
  longitude : any
  constructor(private fs:AngularFirestore ,private http: HttpClient, private router: Router, private afAuth: AngularFireAuth) {}

  ngOnInit(): void {
    this.getCurrentLocation();
    this.initializeMap();
    this.fetchRestaurants();
  }

  initializeMap(): void {
    this.map = L.map('map').setView([34, 10], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);
  }

  fetchRestaurants(): void {
    this.http.get<any[]>('http://localhost:5000/').subscribe((restaurants) => {
      this.restaurants = restaurants;
      console.log(this.restaurants);
      // if (this.restaurants) {
      for (const restaurant of this.restaurants) {
        this.createPopupContent(restaurant)
          .then((popupContent) => {
            if (popupContent) {
              // for (const restaurant of this.restaurants) {
              // Créez le marqueur et ajoutez-le à la carte avec le contenu de la popup
              this.createMarker(restaurant, popupContent);
              // }
            } else {
              console.error('Le contenu de la popup est vide.');
            }
          })
          .catch((error) => {
            console.error(
              "Une erreur s'est produite lors de la création de la popup :",
              error
            );
          });
      }
    });
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.latitude = position.coords.latitude;
          this.longitude = position.coords.longitude;
          console.log(`Latitude: ${this.latitude}, Longitude: ${this.longitude}`);
          // localStorage.setItem('latitude', latitude.toString());
          // localStorage.setItem('longitude', longitude.toString());
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
        }
      );
    } else {
      console.error(
        "La géolocalisation n'est pas prise en charge par ce navigateur."
      );
    }
  }
  createMarker(restaurant: any, popupContent: string): void {
    L.marker([restaurant.latitude, restaurant.longitude])
      .addTo(this.map)
      .bindPopup(() => popupContent, {
        maxHeight: 350,
      });
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
// Fonction pour calculer la distance entre deux points géographiques en utilisant la formule de Haversine
calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = this.deg2rad(lat2 - lat1);
  const dLon = this.deg2rad(lon2 - lon1);
  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance en kilomètres
  return distance;
}

// Fonction pour convertir les degrés en radians
deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
  async createPopupContent(restaurant: any): Promise<string> {
    let popupContent = '';
    // Vérifier si la latitude et la longitude sont disponibles
    if (this.latitude && this.longitude) {
        // Convertir latitudeString et longitudeString en nombres
        const latitude = parseFloat(this.latitude);
        const longitude = parseFloat(this.longitude);
        // Calculer la distance entre le restaurant et la position de l'utilisateur
        const distance = this.calculateDistance(latitude, longitude, restaurant.latitude, restaurant.longitude);
        
        // Vérifier si le restaurant est à une distance raisonnable de l'utilisateur
        const maxDistance = 100; // Définir la distance maximale en kilomètres
        if (distance <= maxDistance) {
    const uniqueId = this.generateUniqueId();
    const comentId = this.generateUniqueId();
    popupContent += `<button id="${uniqueId}" class="btn btn-primary"
     style="
    border: none;
    color: white;
    padding: 5px 22px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    margin: 4px 2px;
    cursor: pointer;
    border-radius: 10px;
    transition: transform 0.2s, box-shadow 0.2s;
    outline: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.9);
    }}">Menu</button><br>`;
    document.addEventListener('click', (event) => {
      const targetElement = event.target as HTMLElement;
      if (targetElement && targetElement.id === uniqueId) {
        this.showMenu(`${encodeURIComponent(JSON.stringify(restaurant))}`);
      }
    });
    popupContent += `<br><b>${restaurant.restaurantName}</b><br>
          ${restaurant.address}, ${restaurant.city}, ${restaurant.state} ${restaurant.postalCode}<br><br>`;
          // Stars: ${restaurant.stars}<br>

    // Effectuez toutes les requêtes HTTP de manière asynchrone
    const sentimentRequests = restaurant.reviews.map((review: any) =>
      // {console.log('text: ',review.text),
      this.http.post<any>('http://localhost:5000/predict_sentiment', {
        text: review.text,
      }
    )
  // }
  );

    // Attendez que toutes les requêtes soient terminées
    const sentimentResponses = await forkJoin(sentimentRequests).toPromise();
    // console.log('sentimentResponses: ',sentimentResponses)
    let TerribleReviews = 0;
    let PoorReviews = 0;
    let AverageReviews = 0;
    let GoodReviews = 0;
    let ExcellentReviews = 0;

    sentimentResponses.forEach((data: any) => {
      // console.log('data: ', data);
      switch (data.sentiment) {
        case 'Terrible':
          TerribleReviews++;
          break;
        case 'Poor':
          PoorReviews++;
          break;
        case 'Average':
          AverageReviews++;
          break;
        case 'Very good':
          GoodReviews++;
          break;
        case 'Excellent':
          ExcellentReviews++;
          break;
      }
      // console.log('GoodReviews:', GoodReviews);
    });

    popupContent += `<div style='color:green;'><b>Excellent reviews: ${ExcellentReviews}</b></div>`;
    popupContent += `<div style='color:blue;'><b>Very good reviews: ${GoodReviews}</b></div>`;
    popupContent += `<div style='color:yellow;'><b>Average reviews: ${AverageReviews}</b></div>`;
    popupContent += `<div style='color:orange;'><b>Poor reviews: ${PoorReviews}</b></div>`;
    popupContent += `<div style='color:red;'><b>Terrible reviews: ${TerribleReviews}</b></div>`;
    popupContent += `
      <br>
      <div>
        <textarea id="commentInput" placeholder="Write a new comment..." style="width: 100%; height: 30px;"></textarea>
        <br>
        <button id="${comentId}" class="btn btn-primary" type="button" 
          style="border: none;
          color: white;
          padding: 5px 22px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          ">  <i class="fa-solid fa-pen-alt" data-fa-transform="shrink-10 up-.5" data-fa-mask="fa-solid fa-comment" data-fa-mask-id="comment"></i>
        </button>
      </div>
    `;
    document.addEventListener('click', async (event) => {
      const targetElement = event.target as HTMLElement;
      if (targetElement && targetElement.id === comentId) {
        const commentInput = document.getElementById('commentInput') as HTMLTextAreaElement;
        const commentText = commentInput.value.trim();
        if (commentText !== '') {
          await this.saveCommentToFirebase(restaurant, commentText);
        }
      }
    });
    popupContent += `<br><b>Reviews:</b><br>`;
    for (const review of restaurant.reviews) {
      const truncatedText =
        review.text.length > 1500
          ? review.text.substring(0, 1500) + '...'
          : review.text;
      popupContent += truncatedText + '<br><br>';
    }
    }
    }else{
        const uniqueId = this.generateUniqueId();
        const comentId = this.generateUniqueId();
        popupContent += `<button id="${uniqueId}" class="btn btn-primary"
         style="
        border: none;
        color: white;
        padding: 5px 22px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        margin: 4px 2px;
        cursor: pointer;
        border-radius: 10px;
        transition: transform 0.2s, box-shadow 0.2s;
        outline: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.9);
        }}">Menu</button><br>`;
        document.addEventListener('click', (event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement && targetElement.id === uniqueId) {
            this.showMenu(`${encodeURIComponent(JSON.stringify(restaurant))}`);
          }
        });
        popupContent += `<br><b>${restaurant.restaurantName}</b><br>
              ${restaurant.address}, ${restaurant.city}, ${restaurant.state} ${restaurant.postalCode}<br><br>`;
              // Stars: ${restaurant.stars}<br>
    
        // Effectuez toutes les requêtes HTTP de manière asynchrone
        const sentimentRequests = restaurant.reviews.map((review: any) =>
          // {console.log('text: ',review.text),
          this.http.post<any>('http://localhost:5000/predict_sentiment', {
            text: review.text,
          }
        )
      // }
      );
    
        // Attendez que toutes les requêtes soient terminées
        const sentimentResponses = await forkJoin(sentimentRequests).toPromise();
        // console.log('sentimentResponses: ',sentimentResponses)
        let TerribleReviews = 0;
        let PoorReviews = 0;
        let AverageReviews = 0;
        let GoodReviews = 0;
        let ExcellentReviews = 0;
    
        sentimentResponses.forEach((data: any) => {
          // console.log('data: ', data);
          switch (data.sentiment) {
            case 'Terrible':
              TerribleReviews++;
              break;
            case 'Poor':
              PoorReviews++;
              break;
            case 'Average':
              AverageReviews++;
              break;
            case 'Very good':
              GoodReviews++;
              break;
            case 'Excellent':
              ExcellentReviews++;
              break;
          }
          // console.log('GoodReviews:', GoodReviews);
        });
    
        popupContent += `<div style='color:green;'><b>Excellent reviews: ${ExcellentReviews}</b></div>`;
        popupContent += `<div style='color:blue;'><b>Very good reviews: ${GoodReviews}</b></div>`;
        popupContent += `<div style='color:yellow;'><b>Average reviews: ${AverageReviews}</b></div>`;
        popupContent += `<div style='color:orange;'><b>Poor reviews: ${PoorReviews}</b></div>`;
        popupContent += `<div style='color:red;'><b>Terrible reviews: ${TerribleReviews}</b></div>`;
        popupContent += `
          <br>
          <div>
            <textarea id="commentInput" placeholder="Write a new comment..." style="width: 100%; height: 30px;"></textarea>
            <br>
            <button id="${comentId}" class="btn btn-primary" type="button" 
              style="border: none;
              color: white;
              padding: 5px 22px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
              font-size: 16px;
              margin: 4px 2px;
              cursor: pointer;
              border-radius: 10px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              ">  <i class="fa-solid fa-pen-alt" data-fa-transform="shrink-10 up-.5" data-fa-mask="fa-solid fa-comment" data-fa-mask-id="comment"></i>
            </button>
          </div>
        `;
        document.addEventListener('click', async (event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement && targetElement.id === comentId) {
            const commentInput = document.getElementById('commentInput') as HTMLTextAreaElement;
            const commentText = commentInput.value.trim();
            if (commentText !== '') {
              await this.saveCommentToFirebase(restaurant, commentText);
            }
          }
        });
        popupContent += `<br><b>Reviews:</b><br>`;
        for (const review of restaurant.reviews) {
          const truncatedText =
            review.text.length > 1500
              ? review.text.substring(0, 1500) + '...'
              : review.text;
          popupContent += truncatedText + '<br><br>';
        }
        
    }
  return popupContent;
}
  async saveCommentToFirebase(restaurant: any, commentText: string) {
    try {
      // Chercher l'utilisateur associé au restaurant en utilisant le nom du restaurant
      const userSnapshot = await this.fs.collection('users').ref
        .where('restaurantData.restaurantName', '==', restaurant.restaurantName)
        .get();
        // console.log('userSnapshot:', userSnapshot);
  
      if (userSnapshot.empty) {
        console.error('User not found for the restaurant:', restaurant.restaurantName);
        return;
      }
  
      // Récupérer l'ID de l'utilisateur associé
      let userId;
      userSnapshot.forEach(doc => {
        userId = doc.id;
      });
  
      // Sauvegardez le commentaire dans la table de cet utilisateur
      await this.fs.collection('users').doc(userId).set({
        restaurantData: {
            reviews: [
                ...restaurant.reviews,
                {text: commentText}
            ]
        }
      }, { merge: true });

      console.log('Comment saved successfully!');
      this.fetchRestaurants()
      window.location.reload();
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  }
  
  showMenu(rest: string) {
    const restaurant = JSON.parse(decodeURIComponent(rest));
    // console.log("Afficher le restaurant :", restaurant);
    // Assume fetch method is properly implemented
    fetch('http://localhost:5000/get_menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(restaurant),
    })
      .then((response) => response.json())
      .then((data) => {
        const restaurant_menus = data.restaurant_menus;
        if (restaurant_menus && restaurant_menus.length > 0) {
          const menu = restaurant_menus[0]; // Sélectionner le premier menu récupéré
          const uniqueId = this.generateUniqueId(); // Générer un identifiant unique pour le bouton
          const orderId = this.generateUniqueId(); // Générer un identifiant unique pour le bouton
          // Construction du contenu du menu
          var menuContent = `<div class="menu-content" style="height: 400px; width: 280px;">
          <button id="${uniqueId}" class="btn btn-primary"
           style="
          border: none;
          color: white;
          padding: 5px 22px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
          outline: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }}">Reviews</button><br>
          <b>Menu for ${restaurant.restaurantName}</b><br>
          <p>Dishes: </p>`;
          menu.plats.forEach(
            (plat: { name: any; price: any; image: any }, index: number) => {
              menuContent += `<ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px;border: 1px solid #ddd;padding: 10px;padding-right: 20px;border-radius: 5px;">
              <h6 style="margin= 0px">
              <img src="${plat.image}" alt="${plat.name}" style="height: 25px;width: 25px;object-fit: cover;margin-right: 5px;">
              ${plat.name}
              <spam style="float: right;color: #007BFF;">${plat.price} dt</spam>
              </h6>
              </li>
              </ul>`;
            }
          );
          menuContent += `
          <button id="${orderId}" class="btn btn-primary shadow" type="button">
            Place Order 
          </button>
          <div class="offcanvas offcanvas-start" tabindex="-1" id="offcanvasExample" aria-labelledby="offcanvasExampleLabel">
            <div class="offcanvas-header">
              <h4 class="offcanvas-title" id="offcanvasExampleLabel">Menu for ${restaurant.restaurantName}</h4>
              <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
              <div>
                <b>Dishes:</b><br>
              </div>`;
          menu.plats.forEach(
            (plat: { name: any; price: any; image: any }, index: number) => {
              menuContent += `<ul style="list-style: none; padding: 0;">
                  <li style="margin-bottom: 10px;border: 1px solid #ddd;padding: 10px;padding-right: 20px;border-radius: 5px;">
                  <h6 style="margin= 0px">
                  <img src="${plat.image}" alt="${plat.name}" style="height: 25px;width: 25px;object-fit: cover;margin-right: 5px;">
                  ${plat.name}
                  <spam style="float: right;color: #007BFF;">${plat.price} dt</spam>
                  </h6>
                  </li>
                  </ul>`;
            }
          );
          menuContent += `
                </div>
              </div>
            </div>`;
          document.addEventListener('click', (event) => {
            const targetElement = event.target as HTMLElement;
            if (targetElement && targetElement.id === uniqueId) {
              this.showReviews(
                `${encodeURIComponent(JSON.stringify(restaurant))}`
              );
            }
          });
          document.addEventListener('click', (event) => {
            const targetElement = event.target as HTMLElement;
            if (targetElement && targetElement.id === orderId) {
              this.placeOrder(`${encodeURIComponent(JSON.stringify(menu))}`,`${encodeURIComponent(JSON.stringify(restaurant))}`);
            }
          });

          // Mettre à jour le contenu de la popup
          this.map.eachLayer(function (layer: {
            getLatLng: () => {
              (): any;
              new (): any;
              equals: { (arg0: [any, any]): any; new (): any };
            };
            getPopup: () => {
              (): any;
              new (): any;
              setContent: { (arg0: string): void; new (): any };
            };
          }) {
            if (
              layer instanceof L.Marker &&
              layer
                .getLatLng()
                .equals([restaurant.latitude, restaurant.longitude])
            ) {
              layer.getPopup().setContent(menuContent);
            }
          });
          console.log(
            "Afficher le menu pour le restaurant'",
            restaurant.restaurantName,
            "': ",
            menu
          );
          return menuContent;
        } else {
          // console.error("No menu found for this restaurant");
          const uniqueId = this.generateUniqueId(); // Générer un identifiant unique pour le bouton
          // Construction du contenu du menu
          var menuContent = `<div class="menu-content" style="height: 400px; width: 300px;">
          <button id="${uniqueId}" style="background-color: #008CBA; /* Blue */
          border: none;
          color: white;
          padding: 5px 22px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
          outline: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }}">Reviews</button><br>
          <b>We regret to inform you that this restaurant does not have a menu available at the moment. Please check back later or contact us for more information.</b><br>
          </div>`;
          document.addEventListener('click', (event) => {
            const targetElement = event.target as HTMLElement;
            if (targetElement && targetElement.id === uniqueId) {
              this.showReviews(
                `${encodeURIComponent(JSON.stringify(restaurant))}`
              );
            }
          });

          // Mettre à jour le contenu de la popup
          this.map.eachLayer(function (layer: {
            getLatLng: () => {
              (): any;
              new (): any;
              equals: { (arg0: [any, any]): any; new (): any };
            };
            getPopup: () => {
              (): any;
              new (): any;
              setContent: { (arg0: string): void; new (): any };
            };
          }) {
            if (
              layer instanceof L.Marker &&
              layer
                .getLatLng()
                .equals([restaurant.latitude, restaurant.longitude])
            ) {
              layer.getPopup().setContent(menuContent);
            }
          });
          console.log(
            "aucun menu n'est actuellement disponible pour ce restaurant."
          );
          return menuContent;
        }
      })
      .catch((error) => {
        console.error('Error fetching menu:', error);
      });
  }
  async placeOrder(menu: string,rest:any) {
    const userConnect = localStorage.getItem('userConnect');
    if (userConnect) {

    // Stocker le menu actuel dans un endroit où il peut être accessible depuis la page de commande
    localStorage.setItem('currentMenu', menu);
    localStorage.setItem('currentRestaurant', rest);
    const storedRest = rest
    if (storedRest !== null) {
      const decodedRest = decodeURIComponent(storedRest);
      const restaurant = JSON.parse(decodedRest);
      console.log("restaurant:",restaurant)
      const userSnapshot = await this.fs.collection('users').ref
      .where('restaurantData.restaurantName', '==', restaurant.restaurantName)
      .get();
      // console.log('userSnapshot:', userSnapshot);
      
      if (userSnapshot.empty) {
        console.error('User not found for the restaurant:', restaurant.restaurantName);
        return;
      }
      
      // Récupérer l'ID de l'utilisateur associé
      let userId;
      userSnapshot.forEach(doc => {
        userId = doc.id;
        localStorage.setItem('currentUid', userId);
      });
    }
      this.router.navigate(['/order']);
    } else {
      // L'utilisateur n'est pas connecté
      if (confirm('You must be logged in to access this page. Do you want to log in now?')) {
        // Rediriger l'utilisateur vers la page de connexion
        this.router.navigate(['/login']);
      }
    }
    
  }

  // Function to handle showing reviews
  showReviews(rest: string) {
    const restaurant = JSON.parse(decodeURIComponent(rest));
    // console.log("Restaurant :", restaurant);
    console.log(
      'Afficher les avis pour le restaurant :',
      restaurant.restaurantName
    );

    // Mettre à jour le contenu de la popup avec les avis
    this.map.eachLayer(
      (layer: {
        getLatLng: () => {
          (): any;
          new (): any;
          equals: { (arg0: [any, any]): any; new (): any };
        };
        getPopup: () => {
          (): any;
          new (): any;
          setContent: { (arg0: any): void; new (): any };
        };
      }) => {
        if (
          layer instanceof L.Marker &&
          layer.getLatLng().equals([restaurant.latitude, restaurant.longitude])
        ) {
          this.createPopupContent(restaurant)
            .then(function (popupContent: any) {
              layer.getPopup().setContent(popupContent);
            })
            .catch(function (error: any) {
              console.error(
                "Une erreur s'est produite lors de l'affichage des avis :",
                error
              );
            });
        }
      }
    );
  }
}
