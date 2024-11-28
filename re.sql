-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 23, 2024 at 11:20 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bookingweb`
--

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservationstest` (
  `reservation_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `reservation_date` date NOT NULL,
  `reservation_time_from` time NOT NULL,
  `reservation_time_to` time NOT NULL,
  `duration` int(11) NOT NULL,
  `status` enum('active','cancelled') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `note` varchar(255) NOT NULL,
  PRIMARY KEY (`reservation_id`),
  KEY `user_id` (`user_id`),
  KEY `table_id` (`table_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `chk_reservation_time` CHECK (
    `reservation_time_from` < `reservation_time_to` AND
    `reservation_time_to` <= '23:00:00'
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservationstest` (`reservation_id`, `user_id`, `table_id`, `room_id`, `reservation_date`, `reservation_time_from`, `reservation_time_to`, `duration`, `status`, `created_at`, `note`) VALUES
(1, 2, 1, 1, '2024-11-08', '06:00:00', '08:00:00', 2, 'active', '2024-11-15 08:12:15', ''),
(6, 1, 10, 1, '2024-11-22', '00:00:00', '00:00:00', 0, 'active', '2024-11-15 13:17:15', ''),
(7, 1, 10, 1, '2024-11-20', '19:00:00', '00:00:00', 5, 'active', '2024-11-20 15:22:26', ''),
(8, 2, 3, 1, '2024-11-20', '19:00:00', '00:00:00', 5, 'active', '2024-11-20 15:23:39', ''),
(9, 7, 10, 2, '2024-11-23', '18:00:00', '23:00:00', 5, 'active', '2024-11-22 18:20:26', ''),
(10, 7, 10, 2, '2024-11-23', '18:00:00', '23:00:00', 5, 'active', '2024-11-22 18:20:45', ''),
(11, 7, 10, 2, '2024-11-24', '18:00:00', '23:00:00', 5, 'active', '2024-11-22 18:20:45', ''),
(12, 7, 10, 2, '2024-11-25', '18:00:00', '23:00:00', 5, 'active', '2024-11-22 18:20:45', ''),
(13, 7, 10, 2, '2024-11-26', '18:00:00', '23:00:00', 5, 'active', '2024-11-22 18:20:45', ''),
(14, 2, 3, 1, '2024-11-25', '20:00:00', '00:00:00', 4, 'active', '2024-11-22 18:25:43', ''),
(15, 2, 9, 1, '2024-11-27', '20:00:00', '23:00:00', 3, 'active', '2024-11-22 18:37:50', '');

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservationstest`
ADD CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
ADD CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`table_id`) REFERENCES `tables` (`table_id`),
ADD CONSTRAINT `reservations_ibfk_3` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
