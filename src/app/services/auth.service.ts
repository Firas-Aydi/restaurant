import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user: Observable<firebase.User | null>;

  constructor(private fa: AngularFireAuth) {
    this.user = this.fa.user;
  }

  signUp(email: string, password: string): Promise<firebase.auth.UserCredential> {
    return this.fa.createUserWithEmailAndPassword(email, password);
  }

  signIn(email: string, password: string): Promise<firebase.auth.UserCredential> {
    return this.fa.signInWithEmailAndPassword(email, password);
  }
}
